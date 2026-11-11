import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment.development';
import { ApiStandardResponse } from '../../shared/interfaces/api-response.interface';
import { CreatePlatformAdmin, PlatformUser, PlatformUsersQuery, PlatformAdminsQuery } from '../interfaces/admin.interface';
import { CatalogApiResponse, CatalogRequest } from '../../shared/interfaces/catalogs.interface';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}users`;
  createAdmin(body: CreatePlatformAdmin) {
    return this.http.post<ApiStandardResponse<PlatformUser & { emailSent: boolean }>>(`${this.base}/platform-admins`, body);
  }
  private params(query: object) {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') params = params.set(key, String(value));
    }
    return params;
  }
  listUsers(query: PlatformUsersQuery = {}) {
    return this.http.get<ApiStandardResponse<PlatformUser[]>>(`${this.base}/platform/list`, {
      params: this.params({ page: 1, pageSize: 10, ...query }),
    });
  }
  listAdmins(query: PlatformAdminsQuery = {}) {
    return this.http.get<ApiStandardResponse<PlatformUser[]>>(`${this.base}/platform-admins/list`, {
      params: this.params({ page: 1, pageSize: 10, ...query }),
    });
  }
  setAdminStatus(id: string, isActive: boolean) {
    return this.http.patch<ApiStandardResponse<{ isActive: boolean }>>(`${this.base}/platform-admins/${id}/status`, { isActive });
  }
  listRoles(query: CatalogRequest) {
    return this.http.get<ApiStandardResponse<CatalogApiResponse[]>>(`${this.base}/platform/roles/catalog`, {
      params: this.params(query),
    });
  }
  listStores(query: CatalogRequest) {
    return this.http.get<ApiStandardResponse<CatalogApiResponse[]>>(`${this.base}/platform/stores/catalog`, {
      params: this.params(query),
    });
  }
  deactivateUser(id: string) {
    return this.http.patch<ApiStandardResponse<{ isActive: boolean }>>(`${this.base}/platform/${id}/deactivate`, {});
  }
  setUserStatus(id: string, isActive: boolean) {
    return this.http.patch<ApiStandardResponse<{ isActive: boolean }>>(`${this.base}/platform/${id}/status`, { isActive });
  }
}
