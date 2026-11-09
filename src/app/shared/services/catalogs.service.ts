import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CatalogApiResponse,
  CatalogRequest,
} from '../interfaces/catalogs.interface';
import { environment } from '../../../environments/environment.development';
import { ApiStandardResponse } from '../interfaces/api-response.interface';

@Injectable({
  providedIn: 'root',
})
export class CatalogsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}catalogs`;
  private routes = {
    listCurrencies: '/currencies/get',
    listCountries: '/countries/get',
    listStates: (countryId: string) => `/states/${countryId}/get`,
    listMunicipalities: (stateId: string) => `/municipalities/${stateId}/get`,
    listLocalities: (municipalityId: string) =>
      `/localities/${municipalityId}/get`,
  };

  private createParams(query?: CatalogRequest): HttpParams {
    let params = new HttpParams();

    if (query) {
      if (query.page !== undefined)
        params = params.set('page', query.page.toString());
      if (query.pageSize !== undefined)
        params = params.set('pageSize', query.pageSize.toString());
      if (query.search) params = params.set('search', query.search);
      if (query.isActive !== undefined)
        params = params.set('isActive', query.isActive.toString());
    }

    return params;
  }

  public getCurrencies(
    query?: CatalogRequest,
  ): Observable<ApiStandardResponse<CatalogApiResponse[]>> {
    const params = this.createParams(query);
    return this.http.get<ApiStandardResponse<CatalogApiResponse[]>>(
      `${this.baseUrl}${this.routes.listCurrencies}`,
      { params },
    );
  }

  public getCountries(
    query?: CatalogRequest,
  ): Observable<ApiStandardResponse<CatalogApiResponse[]>> {
    const params = this.createParams(query);
    return this.http.get<ApiStandardResponse<CatalogApiResponse[]>>(
      `${this.baseUrl}${this.routes.listCountries}`,
      { params },
    );
  }

  public getStatesByCountry(
    countryId: string,
    query?: CatalogRequest,
  ): Observable<ApiStandardResponse<CatalogApiResponse[]>> {
    const params = this.createParams(query);
    return this.http.get<ApiStandardResponse<CatalogApiResponse[]>>(
      `${this.baseUrl}${this.routes.listStates(countryId)}`,
      { params },
    );
  }

  public getMunicipalitiesByState(
    stateId: string,
    query?: CatalogRequest,
  ): Observable<ApiStandardResponse<CatalogApiResponse[]>> {
    const params = this.createParams(query);
    return this.http.get<ApiStandardResponse<CatalogApiResponse[]>>(
      `${this.baseUrl}${this.routes.listMunicipalities(stateId)}`,
      { params },
    );
  }

  public getLocalitiesByMunicipality(
    municipalityId: string,
    query?: CatalogRequest,
  ): Observable<ApiStandardResponse<CatalogApiResponse[]>> {
    const params = this.createParams(query);
    return this.http.get<ApiStandardResponse<CatalogApiResponse[]>>(
      `${this.baseUrl}${this.routes.listLocalities(municipalityId)}`,
      { params },
    );
  }
}
