import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { EMPTY, expand, map, reduce } from 'rxjs';
import { environment } from '../../../environments/environment.development';
import { ApiStandardResponse } from '../../shared/interfaces/api-response.interface';
import { InventoryLocation } from '../interfaces/inventory.interface';
import { InventorySale } from '../interfaces/inventory.interface';
import { InventoryMovementRequest, InventoryQuery, InventoryUnit, InventoryVariant, StockBalance, StockMovement, TransferTarget } from '../interfaces/inventory.interface';

@Injectable({ providedIn: 'root' })
export class InventoryService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}inventory`;
  private get<T>(path: string, query: InventoryQuery & { onlyWithStock?: boolean; folio?: string } = {}) {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) if (value !== undefined && value !== '') params = params.set(key, String(value));
    return this.http.get<ApiStandardResponse<T>>(`${this.base}/${path}`, { params });
  }
  stock(query: InventoryQuery) { return this.get<StockBalance[]>('stock/list', query); }
  sales(folio: string, page = 1, pageSize = 5) { return this.get<InventorySale[]>('sales/list', { folio, page, pageSize }); }
  movements(query: InventoryQuery) { return this.get<StockMovement[]>('movements/list', query); }
  units(query: InventoryQuery) { return this.get<InventoryUnit[]>('units/list', query); }
  variants() {
    const page = (value: number) => this.get<InventoryVariant[]>('variants/list', { page: value, pageSize: 100 });
    return page(1).pipe(expand(response => response.meta && response.meta.page < response.meta.totalPages ? page(response.meta.page + 1) : EMPTY),
      map(response => response.data), reduce((all, items) => [...all, ...items], [] as InventoryVariant[]));
  }
  transferTargets() { return this.get<TransferTarget[]>('transfer-targets').pipe(map(response => response.data)); }
  locations(targetStoreId?: string, productVariationId?: string, onlyWithStock = false) {
    const path = targetStoreId ? `transfer/${encodeURIComponent(targetStoreId)}/locations` : 'movement-locations';
    const page = (value: number) => this.get<InventoryLocation[]>(path, { page: value, pageSize: 100, productVariationId, onlyWithStock });
    return page(1).pipe(expand(response => response.meta && response.meta.page < response.meta.totalPages ? page(response.meta.page + 1) : EMPTY),
      map(response => response.data), reduce((all, items) => [...all, ...items], [] as InventoryLocation[]));
  }
  add(body: InventoryMovementRequest) { return this.http.post<ApiStandardResponse<{ processedItemsCount: number }>>(`${this.base}/create`, body); }
  discount(body: InventoryMovementRequest) { return this.http.post<ApiStandardResponse<{ processedItemsCount: number }>>(`${this.base}/discount`, body); }
  transfer(targetStoreId: string, body: InventoryMovementRequest) {
    return this.http.post<ApiStandardResponse<{ processedItemsCount: number }>>(`${this.base}/transfer/${targetStoreId}`, body);
  }
}
