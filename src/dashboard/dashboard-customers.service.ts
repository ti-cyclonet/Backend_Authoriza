import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';

/** Rol de los clientes que se registran en la tienda online (MarketPlace) de un negocio de InOut. */
export const CLIENT_ROLE = 'clienteInout';
const DAY_MS = 24 * 60 * 60 * 1000;
const num = (v: any) => Number(v) || 0;

export interface StoreCustomers {
  storeId: string;
  name: string;
  /** Correo del dueño del contrato (la persona natural no tiene razón social). */
  email: string | null;
  clients: number;
  new30: number;
  /** Empezaron el registro en la tienda y no confirmaron el código del correo. */
  pending: number;
}

export interface CustomerStats {
  /** Personas distintas del ecosistema (una persona con varias apps o tiendas cuenta una vez). */
  uniqueUsers: { total: number; clientsOnly: number; staffOnly: number; both: number; noRole: number };
  /** Clientes que compran en más de una tienda. */
  multiStoreClients: number;
  stores: StoreCustomers[];
  pendingTotal: number;
}

/** Nombre del negocio: razón social, o nombre y apellido de la persona natural. */
export function storeName(user: any): string {
  const bd = user?.basicData;
  return bd?.legalEntityData?.businessName
    || [bd?.naturalPersonData?.firstName, bd?.naturalPersonData?.firstSurname].filter(Boolean).join(' ')
    || user?.strUserName
    || 'Tienda';
}

/**
 * Clientes de las tiendas online de InOut en el Dashboard de Authoriza: cada
 * cliente queda con el rol clienteInout en el contrato de InOut de la tienda.
 */
@Injectable()
export class DashboardCustomersService {
  constructor(@InjectRepository(User) private userRepository: Repository<User>) {}

  async getCustomerStats(now = new Date()): Promise<CustomerStats> {
    const q = (sql: string, params: unknown[] = []) => this.userRepository.manager.query(sql, params);
    const since30 = new Date(now.getTime() - 30 * DAY_MS);

    const [byStore, unique, multi, pendingRows] = await Promise.all([
      q(`SELECT c."userId" AS "storeId",
                COUNT(DISTINCT ur."userId") FILTER (WHERE ur.status = 'ACTIVE') AS clients,
                COUNT(DISTINCT ur."userId") FILTER (WHERE ur.status = 'ACTIVE' AND ur."createdAt" >= $2) AS new30
           FROM user_roles ur
           JOIN rol r ON r.id = ur."roleId" AND r."strName" = $1
           JOIN contract c ON c.id = ur."contractId"
          GROUP BY c."userId"`, [CLIENT_ROLE, since30]),
      q(`WITH x AS (
           SELECT u.id,
                  bool_or(r."strName" = $1 AND ur.status = 'ACTIVE') AS cli,
                  bool_or(r."strName" <> $1 AND ur.status = 'ACTIVE') AS staff
             FROM "user" u
             LEFT JOIN user_roles ur ON ur."userId" = u.id
             LEFT JOIN rol r ON r.id = ur."roleId"
            WHERE u.deleted_at IS NULL
            GROUP BY u.id)
         SELECT COUNT(*) AS total,
                COUNT(*) FILTER (WHERE cli IS TRUE AND staff IS NOT TRUE) AS "clientsOnly",
                COUNT(*) FILTER (WHERE staff IS TRUE AND cli IS NOT TRUE) AS "staffOnly",
                COUNT(*) FILTER (WHERE cli IS TRUE AND staff IS TRUE) AS both,
                COUNT(*) FILTER (WHERE cli IS NOT TRUE AND staff IS NOT TRUE) AS "noRole"
           FROM x`, [CLIENT_ROLE]),
      q(`SELECT COUNT(*) AS n FROM (
           SELECT ur."userId" FROM user_roles ur
             JOIN rol r ON r.id = ur."roleId" AND r."strName" = $1
            WHERE ur.status = 'ACTIVE'
            GROUP BY ur."userId" HAVING COUNT(DISTINCT ur."contractId") > 1) t`, [CLIENT_ROLE]),
      // Registro empezado en la tienda (consentimiento) sin el rol de cliente en esa tienda
      q(`SELECT uc."tenantId" AS "storeId", COUNT(DISTINCT lower(uc.email)) AS n
           FROM user_consents uc
          WHERE uc.source = 'MARKETPLACE_REGISTER'
            AND NOT EXISTS (
              SELECT 1 FROM user_roles ur
                JOIN rol r ON r.id = ur."roleId" AND r."strName" = $1
                JOIN contract c ON c.id = ur."contractId"
               WHERE ur."userId" = uc."userId" AND c."userId"::text = uc."tenantId")
          GROUP BY uc."tenantId"`, [CLIENT_ROLE]),
    ]);

    const stores = new Map<string, StoreCustomers>();
    const store = (id: string) => {
      if (!stores.has(id)) stores.set(id, { storeId: id, name: '', email: null, clients: 0, new30: 0, pending: 0 });
      return stores.get(id)!;
    };
    for (const r of byStore) Object.assign(store(r.storeId), { clients: num(r.clients), new30: num(r.new30) });
    for (const r of pendingRows) if (r.storeId) store(r.storeId).pending = num(r.n);

    const ids = [...stores.keys()];
    const owners = ids.length
      ? await this.userRepository.find({
          where: { id: In(ids) },
          relations: ['basicData', 'basicData.legalEntityData', 'basicData.naturalPersonData'],
        })
      : [];
    const byId = new Map(owners.map((o) => [o.id, o]));
    for (const s of stores.values()) {
      s.name = storeName(byId.get(s.storeId));
      s.email = byId.get(s.storeId)?.strUserName ?? null;
    }

    const u = unique[0] || {};
    const list = [...stores.values()].filter((s) => s.clients || s.pending).sort((a, b) => b.clients - a.clients || b.pending - a.pending);
    return {
      uniqueUsers: { total: num(u.total), clientsOnly: num(u.clientsOnly), staffOnly: num(u.staffOnly), both: num(u.both), noRole: num(u.noRole) },
      multiStoreClients: num(multi[0]?.n),
      stores: list,
      pendingTotal: list.reduce((s, x) => s + x.pending, 0),
    };
  }
}
