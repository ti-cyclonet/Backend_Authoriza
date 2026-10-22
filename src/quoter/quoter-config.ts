/**
 * Validación y combinación de los parámetros del cotizador. Lo guardado manda;
 * lo que falte (claves nuevas en una versión posterior) sale de los valores
 * por defecto. Las listas (roles, servicios) se reemplazan completas.
 */
import { NIVELES } from './quoter-cost';

const isObj = (v: unknown): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v);

export function mergeConfig(defaults: any, saved: any): any {
  if (!isObj(saved)) return defaults;
  const out: Record<string, any> = { ...defaults };
  for (const [k, v] of Object.entries(saved)) {
    out[k] = isObj(v) && isObj(defaults?.[k]) ? mergeConfig(defaults[k], v) : v;
  }
  return out;
}

const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
const nonNeg = (v: unknown) => num(v) && (v as number) >= 0;

/** Lista de errores (vacía si los parámetros son válidos). */
export function validateConfig(c: any): string[] {
  const errors: string[] = [];
  if (!isObj(c)) return ['Los parámetros deben ser un objeto.'];
  const ley = c.ley || {};
  for (const k of ['smmlv', 'auxTransporte', 'uvt', 'jornadaSemanal', 'semanasMes', 'productividad', 'ibcContratista']) {
    if (!nonNeg(ley[k])) errors.push(`ley.${k} debe ser un número mayor o igual a 0.`);
  }
  if (num(ley.productividad) && (ley.productividad <= 0 || ley.productividad > 100)) errors.push('ley.productividad va entre 1 y 100 (%).');
  if (num(ley.jornadaSemanal) && (ley.jornadaSemanal <= 0 || ley.jornadaSemanal > 60)) errors.push('ley.jornadaSemanal va entre 1 y 60 horas.');
  const emp = c.empresa || {};
  for (const k of ['gastosGenerales', 'margen', 'imprevistos', 'iva', 'recargoServicios', 'trm']) {
    if (!nonNeg(emp[k])) errors.push(`empresa.${k} debe ser un número mayor o igual a 0.`);
  }

  const roles = Array.isArray(c.roles) ? c.roles : [];
  if (!roles.length) errors.push('Debe haber al menos una especialidad.');
  const roleIds = new Set<string>();
  roles.forEach((r: any, i: number) => {
    if (!r?.id || typeof r.id !== 'string') errors.push(`roles[${i}]: falta el id.`);
    else if (roleIds.has(r.id)) errors.push(`roles[${i}]: el id "${r.id}" está repetido.`);
    else roleIds.add(r.id);
    if (!r?.nombre) errors.push(`roles[${i}]: falta el nombre.`);
    if (r?.modalidad !== 'empleado' && r?.modalidad !== 'contratista') errors.push(`roles[${i}]: la modalidad es empleado o contratista.`);
    const niveles = isObj(r?.niveles) ? r.niveles : null;
    if (niveles) {
      for (const n of NIVELES) {
        if (!(num(niveles[n]) && niveles[n] > 0)) errors.push(`roles[${i}]: el valor ${n} debe ser mayor que 0.`);
      }
      if (NIVELES.every((n) => num(niveles[n])) && !(niveles.junior <= niveles.semi && niveles.semi <= niveles.senior)) {
        errors.push(`roles[${i}]: los valores van de menor a mayor (junior ≤ semi senior ≤ senior).`);
      }
    } else if (!(num(r?.mensual) && r.mensual > 0)) {
      errors.push(`roles[${i}]: faltan los valores por nivel.`);
    }
    if (r?.nivelMinimo !== undefined && r?.nivelMinimo !== null && !NIVELES.includes(r.nivelMinimo)) {
      errors.push(`roles[${i}]: el nivel mínimo es junior, semi o senior.`);
    }
  });
  if (emp.nivelBase !== undefined && !NIVELES.includes(emp.nivelBase)) errors.push('empresa.nivelBase es junior, semi o senior.');

  (Array.isArray(c.servicios) ? c.servicios : []).forEach((s: any, i: number) => {
    if (!s?.id || !s?.nombre) errors.push(`servicios[${i}]: falta el id o el nombre.`);
    if (s?.moneda !== 'COP' && s?.moneda !== 'USD') errors.push(`servicios[${i}]: la moneda es COP o USD.`);
    if (!['mensual', 'anual', 'unico'].includes(s?.periodo)) errors.push(`servicios[${i}]: el periodo es mensual, anual o unico.`);
    if (!nonNeg(s?.precio)) errors.push(`servicios[${i}]: el precio debe ser mayor o igual a 0.`);
  });

  for (const [id, p] of Object.entries<any>(isObj(c.paquetes) ? c.paquetes : {})) {
    if (!p?.nombre) errors.push(`paquetes.${id}: falta el nombre.`);
    for (const [rol, h] of Object.entries<any>(isObj(p?.horas) ? p.horas : {})) {
      if (!roleIds.has(rol)) errors.push(`paquetes.${id}: la especialidad "${rol}" no existe.`);
      if (!(Array.isArray(h) && h.length === 3 && h.every(nonNeg) && h[0] <= h[1] && h[1] <= h[2])) {
        errors.push(`paquetes.${id}.${rol}: deben ser 3 horas (optimista ≤ probable ≤ pesimista).`);
      }
    }
  }
  return errors;
}
