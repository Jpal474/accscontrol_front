import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { expand, forkJoin, map, EMPTY, reduce } from 'rxjs';
import { environment } from '../../../environments/environment.development';
import { ApiStandardResponse } from '../../shared/interfaces/api-response.interface';
import { Product, ProductLookup, ProductModel, ProductQuery, SaveProduct, SaveProductVariation } from '../interfaces/product.interface';
import { StoreCurrency } from '../interfaces/product.interface';

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;
  private readonly base = `${this.api}products`;

  list(query: ProductQuery = {}) {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') params = params.set(key, String(value));
    }
    return this.http.get<ApiStandardResponse<Product[]>>(this.base, { params });
  }

  get(id: string) {
    return this.http.get<ApiStandardResponse<Product>>(`${this.base}/${id}`);
  }

  currency() {
    return this.http.get<ApiStandardResponse<StoreCurrency>>(`${this.base}/store-currency`);
  }

  brands() { return this.allPages<ProductLookup>('brands'); }
  categories() { return this.allPages<ProductLookup>('product-categories'); }

  create(body: SaveProduct, image?: File) {
    return this.http.post<ApiStandardResponse<Product>>(`${this.base}/create`, this.requestBody(body, image));
  }

  update(id: string, body: Partial<SaveProduct>, image?: File) {
    return this.http.patch<ApiStandardResponse<Product>>(`${this.base}/${id}`, this.requestBody(body, image));
  }

  private requestBody(body: Partial<SaveProduct>, image?: File): Partial<SaveProduct> | FormData {
    if (!image) return body;
    const data = new FormData();
    for (const [key, value] of Object.entries(body)) {
      if (value !== undefined) data.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
    }
    data.append('file', image, image.name);
    return data;
  }

  createVariations(productId: string, variations: SaveProductVariation[]) {
    return this.http.post<ApiStandardResponse<Product['variations']>>(`${this.base}/${productId}/variations`, { variations });
  }

  toggleVariation(id: string) {
    return this.http.patch<ApiStandardResponse<boolean>>(`${this.base}/${id}/variation/toggle`, {});
  }

  addCompatibilities(productId: string, deviceModelIds: string[]) {
    return this.http.post<ApiStandardResponse<{ createdCount: number }>>(`${this.base}/compatibilities/create`, {
      items: [{ productId, deviceModelIds }],
    });
  }

  removeCompatibilities(productId: string, deviceModelIds: string[]) {
    return this.http.post<ApiStandardResponse<{ deletedCount: number }>>(`${this.base}/compabilities/delete`, {
      items: [{ productId, deviceModelIds }],
    });
  }

  lookups() {
    return forkJoin({
      categories: this.allPages<ProductLookup>('product-categories'),
      brands: this.allPages<ProductLookup>('brands'),
      models: this.allPages<ProductModel>('products/models'),
    });
  }

  private allPages<T>(path: string) {
    const page = (value: number) => this.http.get<ApiStandardResponse<T[]>>(`${this.api}${path}`, {
      params: { page: value, pageSize: 100 },
    });
    return page(1).pipe(
      expand(response => response.meta && response.meta.page < response.meta.totalPages
        ? page(response.meta.page + 1) : EMPTY),
      map(response => response.data),
      reduce((items, batch) => [...items, ...batch], [] as T[]),
    );
  }
}
