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
 */
export interface QuoterRole {
  id: string;
  nombre: string;
  modalidad: 'empleado' | 'contratista';
  mensual: number;
  arl?: string;
}

export interface RoleCost {
  id: string;
  nombre: string;
  modalidad: string;
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
}

const pct = (v: unknown) => (Number(v) || 0) / 100;

export function roleMonthlyCost(role: QuoterRole, ley: any): number {
  const m = Math.max(0, Number(role.mensual) || 0);
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

export function roleCosts(config: any): RoleCost[] {
  const ley = config?.ley || {};
  const emp = config?.empresa || {};
  const horas = billableHoursPerMonth(ley);
  return (config?.roles || []).map((r: QuoterRole) => {
    const costoMensual = roleMonthlyCost(r, ley);
    const costoHora = horas > 0 ? costoMensual / horas : 0;
    return {
      id: r.id,
      nombre: r.nombre,
      modalidad: r.modalidad,
      mensual: Number(r.mensual) || 0,
      costoMensual: Math.round(costoMensual),
      factor: r.mensual ? Math.round((costoMensual / r.mensual) * 1000) / 1000 : 0,
      horasMes: Math.round(horas * 10) / 10,
      costoHora: Math.round(costoHora),
      tarifaHora: Math.round(costoHora * (1 + pct(emp.gastosGenerales)) * (1 + pct(emp.margen))),
    };
  });
}
