export interface UserStats {
  total: number;
  active: number;
  inactive: number;
  unconfirmed: number;
  byRole: { role: string; count: number }[];
}

export interface InvoiceStats {
  total: number;
  totalValue: number;
  paid: number;
  pending: number;
  overdue: number;
  byStatus: { status: string; count: number; value: number }[];
  monthlyRevenue: { month: string; revenue: number }[];
}

export interface ContractStats {
  total: number;
  active: number;
  expired: number;
  byStatus: { status: string; count: number }[];
}

export class DashboardStatsDto {
  users: UserStats;
  invoices: InvoiceStats;
  contracts: ContractStats;
  lastUpdated: Date;
}