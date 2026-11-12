import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment.development';
import { ApiStandardResponse } from '../../shared/interfaces/api-response.interface';
import { Client, ClientQuery, ClientRequest } from '../interfaces/client.interface';

@Injectable({ providedIn: 'root' })
export class ClientsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}clients`;
  list(query: ClientQuery = {}) {
    let params = new HttpParams();
    for (const [key, value] of Object.entries({ page: 1, pageSize: 10, ...query })) {
      if (value !== undefined && value !== '') params = params.set(key, String(value));
    }
    return this.http.get<ApiStandardResponse<Client[]>>(`${this.base}/list`, { params });
  }
  getById(id: string) {
    return this.http.get<ApiStandardResponse<Client>>(`${this.base}/${id}/get`);
  }
  create(body: ClientRequest) {
    return this.http.post<ApiStandardResponse<Client>>(`${this.base}/create`, body);
  }
  update(id: string, body: ClientRequest) {
    return this.http.patch<ApiStandardResponse<Client>>(`${this.base}/${id}/update`, body);
  }
  toggle(id: string) {
    return this.http.patch<ApiStandardResponse<boolean>>(`${this.base}/${id}/toggle`, {});
  }
}
