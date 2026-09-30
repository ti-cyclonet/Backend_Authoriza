/**
 * Planes de Kiri Finance — qué incluye cada uno (FREE, PLUS y PRO).
 *
 * Única definición en Authoriza: la usan kiri-packages.seed (los 3 paquetes)
 * y cyclon-plus-package.seed (el paquete maestro trae Kiri como PRO).
 * Kiri Finance tiene una copia de esta matriz en
 * Backend_AidCash/src/lib/planes.ts (para la prueba de 14 días, el plan que
 * recibe la pareja de un PRO y cuando Authoriza no responde): si cambias un
 * valor aquí, cámbialo también allá.
 *
 * - feature: 1 = incluida, 0 = no incluida.
 * - quantity: tope; ILIMITADO (999999) = sin límite. No usar 0 para
 *   "ilimitado": el desempate de contratos (findTenantLimits) cuenta como
 *   habilitadas las variables con valor >= 1.
 */
export const ILIMITADO = 999999;

export type PlanKiri = 'FREE' | 'PLUS' | 'PRO';

interface VarDef {
  variableName: string;
  displayName: string;
  limitType: 'feature' | 'quantity';
  valores: Record<PlanKiri, number>;
}

const U = ILIMITADO;

export const KIRI_PLAN_VARIABLES: VarDef[] = [
  // ── Funciones ──
  { variableName: 'budgetManagement', displayName: 'Gestión de presupuesto', limitType: 'feature', valores: { FREE: 1, PLUS: 1, PRO: 1 } },
  { variableName: 'impulseExpenses', displayName: 'Registro de gastos del día a día', limitType: 'feature', valores: { FREE: 1, PLUS: 1, PRO: 1 } },
  { variableName: 'debtsTracking', displayName: 'Control de deudas', limitType: 'feature', valores: { FREE: 1, PLUS: 1, PRO: 1 } },
  { variableName: 'fixedExpenses', displayName: 'Gastos fijos', limitType: 'feature', valores: { FREE: 1, PLUS: 1, PRO: 1 } },
  { variableName: 'savingsPockets', displayName: 'Bolsillos de ahorro', limitType: 'feature', valores: { FREE: 1, PLUS: 1, PRO: 1 } },
  { variableName: 'emergencyFund', displayName: 'Fondo de emergencia', limitType: 'feature', valores: { FREE: 1, PLUS: 1, PRO: 1 } },
  { variableName: 'extraIncomes', displayName: 'Ingresos extras', limitType: 'feature', valores: { FREE: 1, PLUS: 1, PRO: 1 } },
  { variableName: 'gamification', displayName: 'Árbol Kiri, misiones y racha', limitType: 'feature', valores: { FREE: 1, PLUS: 1, PRO: 1 } },
  { variableName: 'basicReports', displayName: 'Balance e historial', limitType: 'feature', valores: { FREE: 1, PLUS: 1, PRO: 1 } },
  { variableName: 'aiCoach', displayName: 'Kiri Coach con IA', limitType: 'feature', valores: { FREE: 1, PLUS: 1, PRO: 1 } },
  { variableName: 'socialConnections', displayName: 'Conexiones sociales', limitType: 'feature', valores: { FREE: 1, PLUS: 1, PRO: 1 } },
  { variableName: 'advancedReports', displayName: 'Reportes en PDF', limitType: 'feature', valores: { FREE: 0, PLUS: 1, PRO: 1 } },
  { variableName: 'debtStrategies', displayName: 'Estrategias de deuda (Bola de nieve / Avalancha)', limitType: 'feature', valores: { FREE: 0, PLUS: 1, PRO: 1 } },
  { variableName: 'p2pLoans', displayName: 'Préstamos entre usuarios', limitType: 'feature', valores: { FREE: 0, PLUS: 1, PRO: 1 } },
  { variableName: 'sharedDebts', displayName: 'Deudas compartidas', limitType: 'feature', valores: { FREE: 0, PLUS: 1, PRO: 1 } },
  { variableName: 'sharedPockets', displayName: 'Bolsillos compartidos', limitType: 'feature', valores: { FREE: 0, PLUS: 1, PRO: 1 } },
  { variableName: 'householdBudget', displayName: 'Presupuesto del hogar en pareja (tu pareja recibe PLUS)', limitType: 'feature', valores: { FREE: 0, PLUS: 0, PRO: 1 } },
  { variableName: 'openBanking', displayName: 'Conexión con tu banco', limitType: 'feature', valores: { FREE: 0, PLUS: 0, PRO: 1 } },
  { variableName: 'receiptItems', displayName: 'Escáner: separar recibos por productos', limitType: 'feature', valores: { FREE: 0, PLUS: 0, PRO: 1 } },
  { variableName: 'savedScenarios', displayName: 'Escenarios guardados en Proyecciones', limitType: 'feature', valores: { FREE: 0, PLUS: 0, PRO: 1 } },
  { variableName: 'exclusiveBadges', displayName: 'Insignias exclusivas', limitType: 'feature', valores: { FREE: 0, PLUS: 0, PRO: 1 } },
  { variableName: 'prioritySupport', displayName: 'Soporte prioritario', limitType: 'feature', valores: { FREE: 0, PLUS: 0, PRO: 1 } },
  // ── Cantidades ──
  { variableName: 'nCategorias', displayName: 'categorías de presupuesto', limitType: 'quantity', valores: { FREE: 5, PLUS: 20, PRO: U } },
  { variableName: 'nDeudas', displayName: 'deudas', limitType: 'quantity', valores: { FREE: 5, PLUS: U, PRO: U } },
  { variableName: 'nGastosFijos', displayName: 'gastos fijos', limitType: 'quantity', valores: { FREE: 8, PLUS: U, PRO: U } },
  { variableName: 'nBolsillos', displayName: 'bolsillos de ahorro', limitType: 'quantity', valores: { FREE: 3, PLUS: 10, PRO: U } },
  { variableName: 'nMeDeben', displayName: 'registros de "Me deben"', limitType: 'quantity', valores: { FREE: 3, PLUS: U, PRO: U } },
  { variableName: 'nIngresosExtra', displayName: 'ingresos extra', limitType: 'quantity', valores: { FREE: 2, PLUS: U, PRO: U } },
  { variableName: 'nConexiones', displayName: 'conexiones en Social', limitType: 'quantity', valores: { FREE: 2, PLUS: 20, PRO: U } },
  { variableName: 'nBolsillosCompartidos', displayName: 'bolsillos compartidos', limitType: 'quantity', valores: { FREE: 0, PLUS: 3, PRO: U } },
  { variableName: 'nPrestamos', displayName: 'préstamos entre usuarios', limitType: 'quantity', valores: { FREE: 0, PLUS: U, PRO: U } },
  { variableName: 'mesesProyeccion', displayName: 'meses de proyección', limitType: 'quantity', valores: { FREE: 3, PLUS: 24, PRO: 24 } },
  { variableName: 'mesesHistorial', displayName: 'meses de historial en Balance', limitType: 'quantity', valores: { FREE: 3, PLUS: 24, PRO: U } },
  { variableName: 'iaMensajesMes', displayName: 'mensajes con Kiri Coach al mes', limitType: 'quantity', valores: { FREE: 10, PLUS: 150, PRO: 500 } },
  { variableName: 'iaDictadosMes', displayName: 'dictados por voz al mes', limitType: 'quantity', valores: { FREE: 10, PLUS: 100, PRO: 300 } },
  { variableName: 'iaEscaneosMes', displayName: 'escaneos de recibos al mes', limitType: 'quantity', valores: { FREE: 3, PLUS: 30, PRO: 100 } },
];

/** Precios en COP: mensual y anual (el anual trae unos 2 meses gratis). */
export const KIRI_PLAN_PRECIOS: Record<PlanKiri, { mensual: number; anual: number }> = {
  FREE: { mensual: 0, anual: 0 },
  PLUS: { mensual: 14900, anual: 139000 },
  PRO: { mensual: 24900, anual: 229000 },
};

/** Variables de un plan, en el formato de UsageLimitVariable. */
export function variablesDelPlan(plan: PlanKiri) {
  return KIRI_PLAN_VARIABLES.map(v => ({
    variableName: v.variableName,
    displayName: v.displayName,
    maxValue: v.valores[plan],
    limitType: v.limitType,
    targetApplication: 'Kiri',
  }));
}
