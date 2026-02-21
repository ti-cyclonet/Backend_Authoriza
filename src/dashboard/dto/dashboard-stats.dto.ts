export interface UserStats {
  total: number;
  active: number;
  inactive: number;
  unconfirmed: number;
  byRole: { role: string; count: number }[];
}

export interface PrincipalUserStats {
  total: number;
  unconfirmed: number;
  active: number;
  suspended: number;
  expiring: number;
  delinquent: number;
}

export interface ApplicationStats {
  total: number;
  byApplication: { name: string; userCount: number; roleCount: number }[];
}

export interface PackageStats {
  total: number;
  byPackage: { name: string; contractCount: number; roleCount: number }[];
}

export class DashboardStatsDto {
  users: UserStats;
  principalUsers: PrincipalUserStats;
  applications: ApplicationStats;
  packages: PackageStats;
  lastUpdated: Date;
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