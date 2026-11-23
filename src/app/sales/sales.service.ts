import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { EMPTY, expand, map, reduce } from 'rxjs';
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

@Injectable({ providedIn: 'root' })
export class SalesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}sales`;

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
