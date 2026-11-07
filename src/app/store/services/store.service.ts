import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { RoutesService } from '../../shared/services/routes.service';
import { environment } from '../../../environments/environment.development';
import {
  OwnerApiResponse,
  OwnersListApiRequest,
  OwnersListApiResponse,
  RegisterOwnerInterface,
} from '../interfaces/owner.interface';
import { Observable } from 'rxjs';
import { ApiStandardResponse } from '../../shared/interfaces/api-response.interface';

@Injectable({
  providedIn: 'root',
})
export class StoreService {
  private readonly http = inject(HttpClient);
  private readonly routesService = inject(RoutesService);
  private readonly base = `${environment.apiUrl}users`;
  private baseRoute = 'owners';
  private routes = {
    createOwner: this.baseRoute,
    ownersList: `${this.baseRoute}/list`,
    toggleOwner: (ownerId: string) => `${this.baseRoute}/${ownerId}/toggle`,
    getOwnerById: (ownerId: string) => `${this.baseRoute}/${ownerId}/get`,
    updateOwner: (ownerId: string) => `${this.baseRoute}/${ownerId}/update`,
  };
  constructor() {}

  public createStoreOwner(
    ownerData: RegisterOwnerInterface,
  ): Observable<ApiStandardResponse<OwnerApiResponse>> {
    return this.http.post<ApiStandardResponse<OwnerApiResponse>>(
      `${this.base}/${this.routes.createOwner}`,
      ownerData,
    );
  }

  public listStoreOwners(
    ownerRequest: OwnersListApiRequest,
  ): Observable<ApiStandardResponse<OwnersListApiResponse[]>> {
    let params = new HttpParams();
    Object.keys(ownerRequest).forEach((key) => {
      const value = ownerRequest[key as keyof OwnersListApiRequest];

      if (value !== null && value !== undefined && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return this.http.get<ApiStandardResponse<OwnersListApiResponse[]>>(
      `${this.base}/${this.routes.ownersList}`,
      { params },
    );
  }

  public toggleStoreOwner(
    ownerId: string,
    storesId?: string[],
  ): Observable<ApiStandardResponse<{ isActive: boolean }>> {
    return this.http.patch<ApiStandardResponse<{ isActive: boolean }>>(
      `${this.base}/${this.routes.toggleOwner(ownerId)}`,
      { storeIds: storesId },
    );
  }

  public getOwnerById(
    ownerId: string,
  ): Observable<ApiStandardResponse<OwnerApiResponse>> {
    return this.http.get<ApiStandardResponse<OwnerApiResponse>>(
      `${this.base}/${this.routes.getOwnerById(ownerId)}`,
    );
  }

  public updateOwner(
    ownerId: string,
    body: Partial<RegisterOwnerInterface>,
  ): Observable<ApiStandardResponse<OwnerApiResponse>> {
    return this.http.patch<ApiStandardResponse<OwnerApiResponse>>(
      `${this.base}/${this.routes.updateOwner(ownerId)}`,
      body,
    );
  }
}
