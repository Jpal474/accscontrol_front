import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { EMPTY, expand, forkJoin, map, reduce } from 'rxjs';
import { environment } from '../../environments/environment.development';
import { StockBalance } from '../storage/interfaces/inventory.interface';
import { ApiStandardResponse } from '../shared/interfaces/api-response.interface';

export interface CheckoutProduct extends StockBalance {
  price: number | string;
}

export interface PaymentMethod { id: string; name: string; }
export interface SaleItem {
  id: string;
  quantity: number;
  unitPrice: number | string;
  serialNumbers?: string[];
  productVariation?: { sku: string; product?: { name: string } };
}

export interface Sale {
  id: string;
  folio: string;
  date: string;
  description?: string;
  status: 'COMPLETED' | 'CANCELLED';
  total: number | string;
  paymentMethod?: PaymentMethod;
  soldByUser?: { name: string; lastName: string };
  store?: { name: string; currency?: { name: string } };
  saleItems?: SaleItem[];
}

export interface CreateSale {
  paymentMethodId: string;
  description?: string;
  items: { productVariationId: string; quantity: number; serialNumbers?: string[]; locationId?: string }[];
}

export interface ReportPeriod { startDate: string; endDate: string; }
type ReportNumber = number | string;

interface SalesSummary {
  totalSalesCount: number;
  totalSalesAmount: number;
  averageTicket: number;
  byPaymentMethod: { paymentMethod: string; count: ReportNumber; total: ReportNumber }[];
}

interface DailySales { date: string; totalSales: ReportNumber; totalAmount: ReportNumber; }
interface TopSellingProduct {
  productId: string;
  productName: string;
  sku: string;
  totalQuantitySold: ReportNumber;
  totalRevenue: ReportNumber;
}

interface ProfitTotals {
  unitsSold: number;
  revenue: number;
  cost: number;
  grossProfit: number;
  grossMarginPercent: number | null;
  estimatedCostItems: number;
}

interface SalesProfit {
  summary: ProfitTotals;
  byProduct: (ProfitTotals & { productId: string | null; productName: string | null })[];
}

export interface SalesReports {
  summary: SalesSummary;
  daily: DailySales[];
  topProducts: TopSellingProduct[];
  profit: SalesProfit;
}

@Injectable({ providedIn: 'root' })
export class SalesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}sales`;

  reports(period: ReportPeriod) {
    const report = <T>(name: string, extra = {}) => this.http.get<ApiStandardResponse<T>>(
      `${this.base}/reports/${name}`, { params: { ...period, ...extra } },
    ).pipe(map(response => response.data));

    return forkJoin({
      summary: report<SalesSummary>('summary'),
      daily: report<DailySales[]>('by-date'),
      topProducts: report<TopSellingProduct[]>('top-products', { limit: 10 }),
      profit: report<SalesProfit>('profit'),
    }).pipe(map(result => {
      const productNames = new Map(result.profit.byProduct.map(product => [product.productId, product.productName]));
      return {
        ...result,
        topProducts: result.topProducts.map(product => ({
          ...product, productName: productNames.get(product.productId) || product.productName,
        })),
      };
    }));
  }

  products(search: string, page: number) {
    return this.http.get<ApiStandardResponse<CheckoutProduct[]>>(`${this.base}/checkout/products`, {
      params: { ...(search ? { search } : {}), page, pageSize: 20 },
    });
  }

  paymentMethods() {
    const load = (page: number) => this.http.get<ApiStandardResponse<PaymentMethod[]>>(
      `${environment.apiUrl}payment-methods/list`, { params: { isActive: true, page, pageSize: 100 } },
    );
    return load(1).pipe(
      expand(response => response.meta && response.meta.page < response.meta.totalPages ? load(response.meta.page + 1) : EMPTY),
      map(response => response.data),
      reduce((all, current) => [...all, ...current], [] as PaymentMethod[]),
    );
  }

  create(body: CreateSale) {
    return this.http.post<ApiStandardResponse<Sale>>(`${this.base}/create`, body);
  }

  list(own: boolean, page: number) {
    return this.http.get<ApiStandardResponse<Sale[]>>(`${this.base}/list${own ? '/own' : ''}`, { params: { page, pageSize: 20 } });
  }

  detail(id: string) {
    return this.http.get<ApiStandardResponse<Sale>>(`${this.base}/${id}`);
  }

  cancel(id: string) {
    return this.http.patch<ApiStandardResponse<boolean>>(`${this.base}/${id}/cancel`, {});
  }
}
