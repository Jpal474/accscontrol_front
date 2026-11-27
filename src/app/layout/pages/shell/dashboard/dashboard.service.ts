import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../../../environments/environment.development';
import { ApiStandardResponse } from '../../../../shared/interfaces/api-response.interface';

export type ReportKind = 'sales' | 'profit' | 'inventory' | 'repairs';
export interface Option { id: string; name: string }
export interface ReportFilters {
  kind: ReportKind | '';
  from: string;
  to: string;
  categoryId: string;
  userId: string;
}
export interface DashboardReport {
  kind: ReportKind;
  scope: 'own' | 'store';
  canFilterUsers: boolean;
  page: number;
  pageSize: number;
  store: Option & { currency?: string };
  period: { from: string; to: string };
  total: number;
  columns: string[];
  summary: Record<string, number>;
  rows: Record<string, string | number | null>[];
}
export interface DashboardOverview {
  today: string;
  currency?: string;
  sales: { count: number; revenue: number; grossProfit: number | null; own: boolean } | null;
  repairs: { count: number; older: number; own: boolean; states: { id: string; name: string; count: number }[] } | null;
  inventory: { count: number; items: { id: string; sku: string; name: string }[] } | null;
  actions: { sale: boolean; repair: boolean; inventory: boolean };
}

export interface DashboardSummary {
  stores: Option[];
  platformSummary: { activeStores: number } | null;
  kinds: ReportKind[];
  options?: { categories: Option[]; users: Option[] };
  report: DashboardReport | null;
  overview?: DashboardOverview;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);

  summary(storeId: string | null, filters: ReportFilters, page: number, pageSize = 50) {
    const params = new HttpParams({ fromObject: Object.fromEntries(
      Object.entries({ storeId, ...filters, page, pageSize }).filter(([, value]) => value != null && value !== ''),
    ) as Record<string, string | number> });
    return this.http.get<ApiStandardResponse<DashboardSummary>>(
      `${environment.apiUrl}dashboard/summary`, { params },
    );
  }
}
