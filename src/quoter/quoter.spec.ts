import { QUOTER_DEFAULTS } from './quoter-defaults';
import { mergeConfig, validateConfig } from './quoter-config';
import { effectiveLevel, roleCosts, roleMonthlyCost, roleSalary } from './quoter-cost';

const ley = { ...QUOTER_DEFAULTS.ley, smmlv: 1_000_000, auxTransporte: 100_000 };

describe('cotizador: costo de las especialidades', () => {
  it('empleado con salario bajo: auxilio, prestaciones, seguridad social y parafiscales, con exoneración', () => {
    // 1.500.000 (< 2 SMMLV): aux 100.000
    // prestaciones: 1.600.000 × (8,33+1+8,33)% + 1.500.000 × 4,17% = 282.560 + 62.550
    // seguridad: 1.500.000 × (12 + 0,522)% = 187.830 (sin salud por exoneración)
    // parafiscales: 1.500.000 × 4% = 60.000 (sin ICBF ni SENA)
    const c = roleMonthlyCost({ id: 'x', nombre: 'X', modalidad: 'empleado', mensual: 1_500_000, arl: 'I' }, ley, 1_500_000);
    expect(Math.round(c)).toBe(1_500_000 + 100_000 + 282_560 + 62_550 + 187_830 + 60_000);
  });

  it('empleado con más de 10 SMMLV: paga salud, ICBF y SENA y no recibe auxilio', () => {
    const m = 12_000_000;
    const c = roleMonthlyCost({ id: 'x', nombre: 'X', modalidad: 'empleado', mensual: m, arl: 'I' }, ley, m);
    const esperado = m + m * (8.33 + 1 + 8.33 + 4.17) / 100 + m * (12 + 0.522 + 8.5) / 100 + m * (4 + 3 + 2) / 100;
    expect(c).toBeCloseTo(esperado, 0);
  });

  it('contratista: solo sus honorarios', () => {
    expect(roleMonthlyCost({ id: 'x', nombre: 'X', modalidad: 'contratista', mensual: 5_000_000 }, ley, 5_000_000)).toBe(5_000_000);
  });

  it('costo y tarifa por hora con las horas facturables', () => {
    const [r] = roleCosts({ ...QUOTER_DEFAULTS, ley, roles: [{ id: 'q', nombre: 'QA', modalidad: 'contratista', niveles: { junior: 4_500_000, semi: 5_000_000, senior: 6_000_000 } }] }, 'junior');
    const horas = ley.jornadaSemanal * ley.semanasMes * ley.productividad / 100;
    expect(r.horasMes).toBeCloseTo(horas, 1);
    expect(r.costoHora).toBe(Math.round(4_500_000 / horas));
    const e = QUOTER_DEFAULTS.empresa;
    expect(r.tarifaHora).toBe(Math.round((4_500_000 / horas) * (1 + e.gastosGenerales / 100) * (1 + e.margen / 100)));
  });
});

describe('cotizador: niveles', () => {
  const rol = { id: 'a', nombre: 'Arq', modalidad: 'empleado' as const, niveles: { junior: 1, semi: 2, senior: 3 }, nivelMinimo: 'semi' as const };

  it('usa el nivel base sin bajar del mínimo de la especialidad', () => {
    expect(effectiveLevel(rol, 'junior')).toBe('semi');
    expect(effectiveLevel(rol, 'senior')).toBe('senior');
    expect(effectiveLevel({ ...rol, nivelMinimo: undefined }, 'junior')).toBe('junior');
  });

  it('toma el salario del nivel y acepta el valor único anterior', () => {
    expect(roleSalary(rol, 'senior')).toBe(3);
    expect(roleSalary({ id: 'v', nombre: 'V', modalidad: 'contratista', mensual: 9 }, 'junior')).toBe(9);
  });

  it('las propuestas arrancan en junior: más baratas por hora, con más horas', () => {
    const junior = roleCosts(QUOTER_DEFAULTS, 'junior').find((x) => x.id === 'back')!;
    const semi = roleCosts(QUOTER_DEFAULTS, 'semi').find((x) => x.id === 'back')!;
    expect(junior.nivel).toBe('junior');
    expect(junior.tarifaHora).toBeLessThan(semi.tarifaHora);
    expect(junior.factorHoras).toBeGreaterThan(1);
    expect(junior.tarifaHora * junior.factorHoras).toBeLessThan(semi.tarifaHora * semi.factorHoras);
    expect(roleCosts(QUOTER_DEFAULTS, 'junior').find((x) => x.id === 'arq')!.nivel).toBe('semi');
  });
});

describe('cotizador: parámetros', () => {
  it('los valores por defecto son válidos', () => {
    expect(validateConfig(QUOTER_DEFAULTS)).toEqual([]);
  });

  it('lo guardado manda y lo nuevo sale de los valores por defecto', () => {
    const m = mergeConfig(QUOTER_DEFAULTS, { empresa: { margen: 30 }, roles: [{ id: 'pm', nombre: 'PM', modalidad: 'empleado', niveles: { junior: 1, semi: 2, senior: 3 } }] });
    expect(m.empresa.margen).toBe(30);
    expect(m.empresa.iva).toBe(QUOTER_DEFAULTS.empresa.iva);
    expect(m.roles).toHaveLength(1);
  });

  it('rechaza valores por nivel desordenados', () => {
    const bad = mergeConfig(QUOTER_DEFAULTS, { roles: [{ id: 'pm', nombre: 'PM', modalidad: 'empleado', niveles: { junior: 5, semi: 2, senior: 3 } }], paquetes: {} });
    expect(validateConfig(bad).some((e) => e.includes('de menor a mayor'))).toBe(true);
  });

  it('rechaza horas desordenadas y especialidades que no existen', () => {
    const bad = mergeConfig(QUOTER_DEFAULTS, { paquetes: { 'web.landing': { nombre: 'L', horas: { front: [10, 5, 20], nadie: [1, 2, 3] } } } });
    const errors = validateConfig(bad);
    expect(errors.some((e) => e.includes('web.landing.front'))).toBe(true);
    expect(errors.some((e) => e.includes('"nadie" no existe'))).toBe(true);
  });

  it('rechaza factores de precision en cero o negativos', () => {
    const bad = mergeConfig(QUOTER_DEFAULTS, { factores: { precision: { perfil: { negocio: 0 }, casosDescritos: -1 } } });
    const errors = validateConfig(bad);
    expect(errors).toContain('factores.precision.perfil.negocio debe ser mayor que 0.');
    expect(errors).toContain('factores.precision.casosDescritos debe ser mayor que 0.');
  });
});
