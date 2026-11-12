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
import {
  CreateStoreRequest,
  StoreListResponse,
  StoreParams,
  StoreResponse,
  UpdateStoreRequest,
} from '../interfaces/store.interface';
import {
  CatalogApiResponse,
  CatalogRequest,
} from '../../shared/interfaces/catalogs.interface';
// Importa tus interfaces o tipos de Store y DTOs correspondientes
// import { Store, CreateStoreDto, UpdateStoreDto } from '../interfaces/store.interface';

@Injectable({
  providedIn: 'root',
})
export class StoreService {
  private readonly http = inject(HttpClient);
  private readonly routesService = inject(RoutesService);

  // Base general de la API (ajusta si tus endpoints de stores están en otra ruta base)
  private readonly apiUrl = environment.apiUrl;

  private routes = {
    // Rutas de Owners (las que ya tenías)
    createOwner: 'users/owners',
    ownersList: 'users/owners/list',
    toggleOwner: (ownerId: string) => `users/owners/${ownerId}/toggle`,
    getOwnerById: (ownerId: string) => `users/owners/${ownerId}/get`,
    updateOwner: (ownerId: string) => `users/owners/${ownerId}/update`,

    // Nuevas rutas para Stores
    createStore: 'stores/create',
    getStoreById: (storeId: string) => `stores/${storeId}`,
    updateStore: (storeId: string) => `stores/${storeId}/update`,
    listOwnerStores: `stores/owner/list`,
    listAllStores: `stores/list`,
    toggleStore: (storeId: string) => `stores/${storeId}/toggle`,
    storesSelector: `stores/owner/catalog`,
  };

  constructor() {}

  // ==================== MÉTODOS DE OWNERS ====================

  public createStoreOwner(
    ownerData: RegisterOwnerInterface,
  ): Observable<ApiStandardResponse<OwnerApiResponse>> {
    return this.http.post<ApiStandardResponse<OwnerApiResponse>>(
      `${this.apiUrl}${this.routes.createOwner}`,
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
      `${this.apiUrl}${this.routes.ownersList}`,
      { params },
    );
  }

  public toggleStoreOwner(
    ownerId: string,
    storesId?: string[],
  ): Observable<ApiStandardResponse<{ isActive: boolean }>> {
    return this.http.patch<ApiStandardResponse<{ isActive: boolean }>>(
      `${this.apiUrl}${this.routes.toggleOwner(ownerId)}`,
      { storeIds: storesId },
    );
  }

  public getOwnerById(
    ownerId: string,
  ): Observable<ApiStandardResponse<OwnerApiResponse>> {
    return this.http.get<ApiStandardResponse<OwnerApiResponse>>(
      `${this.apiUrl}${this.routes.getOwnerById(ownerId)}`,
    );
  }

  public updateOwner(
    ownerId: string,
    body: Partial<RegisterOwnerInterface>,
  ): Observable<ApiStandardResponse<OwnerApiResponse>> {
    return this.http.patch<ApiStandardResponse<OwnerApiResponse>>(
      `${this.apiUrl}${this.routes.updateOwner(ownerId)}`,
      body,
    );
  }

  // ==================== MÉTODOS DE STORES ====================

  public createStore(
    storeData: CreateStoreRequest,
  ): Observable<ApiStandardResponse<StoreResponse>> {
    return this.http.post<ApiStandardResponse<StoreResponse>>(
      `${this.apiUrl}${this.routes.createStore}`,
      storeData,
    );
  }

  public getStoreById(
    storeId: string,
  ): Observable<ApiStandardResponse<StoreResponse>> {
    return this.http.get<ApiStandardResponse<StoreResponse>>(
      `${this.apiUrl}${this.routes.getStoreById(storeId)}`,
    );
  }

  public updateStore(
    storeId: string,
    storeData: UpdateStoreRequest,
  ): Observable<ApiStandardResponse<StoreResponse>> {
    return this.http.patch<ApiStandardResponse<StoreResponse>>(
      `${this.apiUrl}${this.routes.updateStore(storeId)}`,
      storeData,
    );
  }

  public getStoresPerOwner(
    storeParams: StoreParams,
  ): Observable<ApiStandardResponse<StoreListResponse[]>> {
    let params = new HttpParams();
    Object.keys(storeParams).forEach((key) => {
      const value = storeParams[key as keyof StoreParams];
      if (value !== null && value !== undefined && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return this.http.get<ApiStandardResponse<StoreListResponse[]>>(
      `${this.apiUrl}${this.routes.listOwnerStores}`,
      { params },
    );
  }

  public getAllStores(
    storeParams: StoreParams,
  ): Observable<ApiStandardResponse<StoreListResponse[]>> {
    let params = new HttpParams();
    Object.keys(storeParams).forEach((key) => {
      const value = storeParams[key as keyof StoreParams];
      if (value !== null && value !== undefined && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return this.http.get<ApiStandardResponse<StoreListResponse[]>>(
      `${this.apiUrl}${this.routes.listAllStores}`,
      { params },
    );
  }

  public toggleStore(
    storeId: string,
  ): Observable<ApiStandardResponse<{ isActive: boolean }>> {
    return this.http.patch<ApiStandardResponse<{ isActive: boolean }>>(
      `${this.apiUrl}${this.routes.toggleStore(storeId)}`,
      {},
    );
  }

  public getStoresCatalog(
    queryParans: CatalogRequest,
  ): Observable<ApiStandardResponse<CatalogApiResponse[]>> {
    let params = new HttpParams();
    Object.keys(queryParans).forEach((key) => {
      const value = queryParans[key as keyof CatalogRequest];

      if (value !== null && value !== undefined && value !== '') {
        params = params.set(key, String(value));
      }
    });

    return this.http.get<ApiStandardResponse<CatalogApiResponse[]>>(
      `${this.apiUrl}${this.routes.storesSelector}`,
      { params },
    );
  }

  public getOwnerProductCatalogs(query: Partial<CatalogRequest> = {}) {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') params = params.set(key, String(value));
    }
    return this.http.get<ApiStandardResponse<CatalogApiResponse[]>>(`${this.apiUrl}stores/owner/product-catalogs`, { params });
  }
}
