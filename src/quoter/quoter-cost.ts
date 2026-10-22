/**
 * Costo por hora de una especialidad según la normativa colombiana. Es la
 * misma fórmula que usa el cotizador de la landing (cotizador/motor.js).
 *
 * Empleado (contrato laboral): salario + auxilio de transporte (si gana hasta
 * 2 SMMLV) + prestaciones (cesantías, intereses, prima, vacaciones) +
 * seguridad social del empleador (pensión, ARL y salud salvo exoneración del
 * art. 114-1 E.T.) + parafiscales (caja; ICBF y SENA salvo exoneración).
 * Contratista (prestación de servicios): sus honorarios; él paga su
 * seguridad social sobre el IBC.
 * Se divide por las horas facturables del mes: jornada × semanas × productividad.
 *
 * NIVELES: cada especialidad tiene un valor por nivel (junior, semi senior,
 * senior). La propuesta usa el nivel base de la empresa, sin bajar del
 * mínimo de la especialidad. Un nivel más bajo cuesta menos por hora pero
 * tarda más (factores.horasNivel).
 */
export type Nivel = 'junior' | 'semi' | 'senior';
export const NIVELES: Nivel[] = ['junior', 'semi', 'senior'];

export interface QuoterRole {
  id: string;
  nombre: string;
  modalidad: 'empleado' | 'contratista';
  /** Valor mensual por nivel. */
  niveles?: Partial<Record<Nivel, number>>;
  /** Nivel más bajo con que se asigna (ej. arquitectura: semi). */
  nivelMinimo?: Nivel;
  /** Valor único (parámetros anteriores a los niveles). */
  mensual?: number;
  arl?: string;
}

export interface RoleCost {
  id: string;
  nombre: string;
  modalidad: string;
  nivel: Nivel;
  mensual: number;
  /** Costo mensual total para la empresa. */
  costoMensual: number;
  /** Factor sobre el salario u honorario. */
  factor: number;
  /** Horas facturables al mes. */
  horasMes: number;
  costoHora: number;
  /** Tarifa de venta por hora (costo + gastos generales + margen). */
  tarifaHora: number;
  /** Multiplicador de horas del nivel. */
  factorHoras: number;
}

const pct = (v: unknown) => (Number(v) || 0) / 100;
const isNivel = (v: unknown): v is Nivel => NIVELES.includes(v as Nivel);

/** Nivel con que se asigna la especialidad: el base, sin bajar de su mínimo. */
export function effectiveLevel(role: QuoterRole, nivelBase: unknown): Nivel {
  const base = isNivel(nivelBase) ? nivelBase : 'junior';
  const min = isNivel(role.nivelMinimo) ? role.nivelMinimo : 'junior';
  return NIVELES.indexOf(base) >= NIVELES.indexOf(min) ? base : min;
}

/** Salario u honorario mensual de la especialidad en ese nivel. */
export function roleSalary(role: QuoterRole, nivel: Nivel): number {
  const n = role.niveles || {};
  const v = Number(n[nivel]);
  if (v > 0) return v;
  // Sin ese nivel: el más cercano disponible, o el valor único anterior
  for (const alt of [nivel, 'semi', 'junior', 'senior'] as Nivel[]) if (Number(n[alt]) > 0) return Number(n[alt]);
  return Math.max(0, Number(role.mensual) || 0);
}

export function roleMonthlyCost(role: QuoterRole, ley: any, mensual = roleSalary(role, 'semi')): number {
  const m = Math.max(0, Number(mensual) || 0);
  if (role.modalidad !== 'empleado') return m;
  const smmlv = Number(ley?.smmlv) || 0;
  const aux = smmlv > 0 && m <= 2 * smmlv ? Number(ley?.auxTransporte) || 0 : 0;
  const p = ley?.prestaciones || {};
  const ss = ley?.seguridadSocial || {};
  const pf = ley?.parafiscales || {};
  const exon = !!ley?.exoneracion114 && smmlv > 0 && m < 10 * smmlv;
  const arl = pct(ley?.arl?.[role.arl || 'I']);
  // El auxilio de transporte entra en la base de cesantías, intereses y prima (no de vacaciones)
  const prestaciones = (m + aux) * (pct(p.cesantias) + pct(p.interesesCesantias) + pct(p.prima)) + m * pct(p.vacaciones);
  const seguridad = m * (pct(ss.pension) + arl + (exon ? 0 : pct(ss.salud)));
  const parafiscales = m * (pct(pf.caja) + (exon ? 0 : pct(pf.icbf) + pct(pf.sena)));
  return m + aux + prestaciones + seguridad + parafiscales;
}

export function billableHoursPerMonth(ley: any): number {
  return (Number(ley?.jornadaSemanal) || 0) * (Number(ley?.semanasMes) || 0) * pct(ley?.productividad);
}

export function roleCosts(config: any, nivelBase: unknown = config?.empresa?.nivelBase): RoleCost[] {
  const ley = config?.ley || {};
  const emp = config?.empresa || {};
  const horas = billableHoursPerMonth(ley);
  const horasNivel = config?.factores?.horasNivel || {};
  return (config?.roles || []).map((r: QuoterRole) => {
    const nivel = effectiveLevel(r, nivelBase);
    const mensual = roleSalary(r, nivel);
    const costoMensual = roleMonthlyCost(r, ley, mensual);
    const costoHora = horas > 0 ? costoMensual / horas : 0;
    return {
      id: r.id,
      nombre: r.nombre,
      modalidad: r.modalidad,
      nivel,
      mensual,
      costoMensual: Math.round(costoMensual),
      factor: mensual ? Math.round((costoMensual / mensual) * 1000) / 1000 : 0,
      horasMes: Math.round(horas * 10) / 10,
      costoHora: Math.round(costoHora),
      tarifaHora: Math.round(costoHora * (1 + pct(emp.gastosGenerales)) * (1 + pct(emp.margen))),
      factorHoras: Number(horasNivel[nivel]) || 1,
    };
  });
}
