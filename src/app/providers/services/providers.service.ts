import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment.development';
import { ApiStandardResponse } from '../../shared/interfaces/api-response.interface';
import { Provider, SaveProvider } from '../interfaces/provider.interface';

@Injectable({ providedIn: 'root' })
export class ProvidersService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}providers`;

  list(page: number, search: string) {
    return this.http.get<ApiStandardResponse<Provider[]>>(`${this.base}/list`, {
      params: { page, pageSize: 10, ...(search ? { search } : {}) },
    });
  }

  get(providerId: string) {
    return this.http.get<ApiStandardResponse<Provider>>(`${this.base}/${providerId}`);
  }

  create(provider: SaveProvider) {
    return this.http.post<ApiStandardResponse<Provider>>(`${this.base}/create`, provider);
  }

  update(providerId: string, provider: SaveProvider) {
    return this.http.patch<ApiStandardResponse<Provider>>(`${this.base}/${providerId}/update`, provider);
  }

  toggle(providerId: string) {
    return this.http.patch<ApiStandardResponse<boolean>>(`${this.base}/${providerId}/toggle`, {});
  }
}
