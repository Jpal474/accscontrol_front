import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment.development';
import { ApiStandardResponse } from '../../shared/interfaces/api-response.interface';
import { CatalogRequest, CatalogApiResponse } from '../../shared/interfaces/catalogs.interface';
import { CatalogEntry, CatalogKind, CreateCatalogEntry } from '../interfaces/catalog.interface';
import { map } from 'rxjs';
@Injectable({ providedIn: 'root' })
export class CatalogsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}catalogs/manage`;
  list(kind: CatalogKind, query: Partial<CatalogRequest> = {}) {
    let params = new HttpParams();
    for (const [key, value] of Object.entries({ page: 1, pageSize: 10, ...query })) {
      if (value !== undefined && value !== '') params = params.set(key, String(value));
    }
    return this.http.get<ApiStandardResponse<CatalogEntry[]>>(`${this.base}/${kind}/list`, { params });
  }
  create(kind: CatalogKind, body: CreateCatalogEntry) {
    return this.http.post<ApiStandardResponse<CatalogEntry>>(`${this.base}/${kind}/create`, body);
  }
  toggle(kind: CatalogKind, id: string) {
    return this.http.patch<ApiStandardResponse<boolean>>(`${this.base}/${kind}/${id}/toggle`, {});
  }
  locationCategories(query: CatalogRequest) {
    return this.list('location-categories', { ...query, isActive: true }).pipe(map(response => ({
      ...response, data: response.data.map(item => ({ id: item.id, value: item.name || '' } as CatalogApiResponse)),
    })));
  }
}
