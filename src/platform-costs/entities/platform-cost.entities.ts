import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';

/**
 * Consumo medido por las apps del ecosistema (acumulado por día): cuántas
 * imágenes/bytes subió cada app a Cloudinary, cuántos correos envió, cuántas
 * llamadas hizo a Belvo… por aplicación y por cliente (tenant).
 */
@Entity({ name: 'platform_usage_daily' })
@Unique(['day', 'application', 'tenantKey', 'platform', 'metric'])
@Index(['day', 'platform'])
export class PlatformUsageDaily {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'date' })
  day: string;

  /** 'Authoriza' | 'Inout' | 'FactoNet' | 'Shotra' | 'Kiri' */
  @Column({ type: 'varchar', length: 30 })
  application: string;

  /** tenantId o '-' cuando el consumo no es de un cliente puntual. */
  @Column({ type: 'varchar', length: 100, default: '-' })
  tenantKey: string;

  /** 'CLOUDINARY' | 'SES' | 'BELVO' | … */
  @Column({ type: 'varchar', length: 30 })
  platform: string;

  /** p. ej. 'uploads', 'upload_bytes', 'emails', 'api_calls' */
  @Column({ type: 'varchar', length: 40 })
  metric: string;

  @Column({ type: 'decimal', precision: 20, scale: 4, default: 0 })
  quantity: number;

  @UpdateDateColumn()
  updatedAt: Date;
}

/** Costo real diario reportado por la plataforma (p. ej. AWS Cost Explorer por servicio). */
@Entity({ name: 'platform_cost_daily' })
@Unique(['day', 'platform', 'service'])
export class PlatformCostDaily {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'date' })
  day: string;

  @Column({ type: 'varchar', length: 30 })
  platform: string;

  /** Servicio dentro de la plataforma (ej. 'Amazon Relational Database Service'). */
  @Column({ type: 'varchar', length: 150 })
  service: string;

  @Column({ type: 'decimal', precision: 14, scale: 6, default: 0 })
  amountUsd: number;

  @UpdateDateColumn()
  updatedAt: Date;
}

/** Última lectura cruda de una plataforma (p. ej. uso de créditos de Cloudinary). */
@Entity({ name: 'platform_snapshots' })
@Unique(['platform'])
export class PlatformSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 30 })
  platform: string;

  @Column({ type: 'jsonb' })
  data: any;

  @Column({ type: 'text', nullable: true })
  error: string | null;

  @UpdateDateColumn()
  capturedAt: Date;
}

export interface PlatformRate {
  platform: string;
  metric: string;
  label: string;
  usdPerUnit: number;
}

/** Configuración de costos de plataformas (una sola fila, global de CycloNet). */
@Entity({ name: 'platform_cost_settings' })
export class PlatformCostSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Tasa para mostrar en pesos. */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 4000 })
  usdToCop: number;

  /** Tarifas para estimar costos de lo medido (Belvo, y SES/Cloudinary si no hay costo real). */
  @Column({ type: 'jsonb', default: () => "'[]'" })
  rates: PlatformRate[];

  /** Presupuesto mensual por plataforma (USD). */
  @Column({ type: 'jsonb', default: () => "'{}'" })
  budgets: Record<string, number>;

  /** Reparto (%) por aplicación de la infraestructura compartida de AWS (EC2, RDS, Amplify…). */
  @Column({ type: 'jsonb', default: () => "'{}'" })
  awsAllocation: Record<string, number>;

  /** Valor mensual del plan de Cloudinary (USD). 0 = se estima por créditos. */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  cloudinaryMonthlyUsd: number;

  /** Costo estimado por crédito de Cloudinary (USD) cuando no hay plan fijo. */
  @Column({ type: 'decimal', precision: 12, scale: 4, default: 0 })
  cloudinaryUsdPerCredit: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
