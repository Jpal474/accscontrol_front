import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { ApiStandardResponse } from '../shared/interfaces/api-response.interface';
import { CatalogApiResponse, CatalogRequest } from '../shared/interfaces/catalogs.interface';
import { StoreCurrency } from '../products/interfaces/product.interface';
import { StockLocation } from '../storage/interfaces/inventory.interface';

export interface Option { id: string; name: string; }
interface Person extends Option { lastName?: string; }
export interface Repair {
  id: string;
  description: string;
  notes?: string;
  price: number | string;
  receivedDate: string;
  updatedAt: string;
  deliveredDate?: string;
  isActive: boolean;
  clientId: string;
  technicianId: string;
  deviceModelId: string;
  repairStateId: string;
  client?: Person;
  technician?: Person;
  createdBy?: Person;
  deviceModel?: { id: string; model: string; brand?: Option };
  repairState?: Option;
}
export interface RepairPart {
  id: string; name: string; sku: string; quantity: number; location: string; createdAt: string; serialNumbers?: string[];
}
export interface RepairStock {
  productVariationId: string; productName: string; sku: string; trackSerialNumbers: boolean; locations: StockLocation[];
}
export interface RepairDetail { repair: Repair; parts: RepairPart[]; }
export interface RepairLookups { states: Option[]; currency: StoreCurrency | null; }
export interface SaveRepair {
  clientId: string; technicianId: string; deviceModelId: string; repairStateId: string;
  description: string; notes?: string; price: number; serialNumber?: string; receivedDate: string;
}

@Injectable({ providedIn: 'root' })
export class RepairsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}repairs`;

  list(page: number, search: string, technicianId?: string) {
    const path = technicianId ? `${encodeURIComponent(technicianId)}/list/own` : 'list';
    return this.http.get<ApiStandardResponse<Repair[]>>(`${this.base}/${path}`, { params: { page, pageSize: 20, search } });
  }

  options(kind: 'clients' | 'technicians' | 'models', { page, pageSize, search }: CatalogRequest) {
    return this.http.get<ApiStandardResponse<CatalogApiResponse[]>>(this.base + '/' + kind, {
      params: { page, pageSize, ...(search ? { search: search.trim().slice(0, 50) } : {}) },
    });
  }

  lookups() {
    return this.http.get<ApiStandardResponse<RepairLookups>>(this.base + '/states');
  }

  create(body: SaveRepair) { return this.http.post<ApiStandardResponse<Repair>>(`${this.base}/create`, body); }

  detail(id: string) { return this.http.get<ApiStandardResponse<RepairDetail>>(`${this.base}/${id}`); }

  update(id: string, body: Partial<SaveRepair>) {
    return this.http.patch<ApiStandardResponse<Repair>>(`${this.base}/${id}/update`, body);
  }

  state(id: string, repairStateId: string, deliver: boolean, notes: string) {
    return this.http.patch<ApiStandardResponse<Repair>>(`${this.base}/${id}/state`, { repairStateId, deliver, notes });
  }

  remove(id: string) { return this.http.delete<ApiStandardResponse<boolean>>(`${this.base}/${id}`); }

  stock(id: string, search: string, page: number) {
    return this.http.get<ApiStandardResponse<RepairStock[]>>(`${this.base}/${id}/stock`, { params: { search, page, pageSize: 20 } });
  }

  consume(id: string, body: { productVariationId: string; locationId: string; quantity: number; serialNumbers?: string[] }) {
    return this.http.post<ApiStandardResponse<{ processedItemsCount: number }>>(`${this.base}/${id}/parts`, body);
  }
}
