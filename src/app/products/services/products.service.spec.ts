import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ProductsService } from './products.service';
import { environment } from '../../../environments/environment.development';

describe('ProductsService', () => {
  let service: ProductsService;
  let http: HttpTestingController;
  const base = environment.apiUrl;
  const result = (data: unknown) => ({ success: true, timestamp: '', data });
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(ProductsService); http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('reads currency from the active-store product endpoint', () => {
    service.currency().subscribe(response => expect(response.data.code).toBe('EUR'));
    http.expectOne(`${base}products/store-currency`).flush(result({ id: 'currency', code: 'EUR', description: 'Euro' }));
  });

  it('uploads a single base image and serializes variants without forcing a content type', () => {
    const file = new File(['image'], 'product.png', { type: 'image/png' });
    const body = { name: 'Funda', price: 100, isActive: false, variations: [{ sku: 'A', color: 'Negro', isActive: true }] };
    service.update('product', body, file).subscribe();
    const req = http.expectOne(`${base}products/product`);
    const form = req.request.body as FormData;
    expect(form instanceof FormData).toBeTrue();
    expect((form.get('file') as File).name).toBe(file.name);
    expect((form.get('file') as File).size).toBe(file.size);
    expect(form.getAll('file').length).toBe(1);
    expect(form.get('isActive')).toBe('false');
    expect(JSON.parse(form.get('variations') as string)).toEqual(body.variations);
    expect(req.request.headers.has('Content-Type')).toBeFalse();
    req.flush(result({}));
  });

  it('sends inactive filters as false and reads the standard response', () => {
    service.list({ page: 2, isActive: false, search: 'Funda' }).subscribe(response => expect(response.data).toEqual([]));
    const req = http.expectOne(request => request.url === `${base}products`);
    expect(req.request.params.get('isActive')).toBe('false');
    expect(req.request.params.get('page')).toBe('2');
    req.flush(result([]));
  });

  it('updates state using the existing product endpoint', () => {
    service.update('product', { isActive: false }).subscribe();
    const req = http.expectOne(`${base}products/product`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ isActive: false }); req.flush(result({}));
  });

  it('loads every lookup page instead of limiting choices to the first 100', () => {
    const loaded = jasmine.createSpy('loaded'); service.lookups().subscribe(loaded);
    http.expectOne(request => request.url === `${base}product-categories`).flush(result([]));
    http.expectOne(request => request.url === `${base}brands`).flush(result([]));
    http.expectOne(request => request.url === `${base}products/models` && request.params.get('page') === '1')
      .flush({ ...result([{ id: 'first' }]), meta: { page: 1, pageSize: 100, total: 101, totalPages: 2 } });
    http.expectOne(request => request.url === `${base}products/models` && request.params.get('page') === '2')
      .flush({ ...result([{ id: 'last' }]), meta: { page: 2, pageSize: 100, total: 101, totalPages: 2 } });
    expect(loaded).toHaveBeenCalledWith({ categories: [], brands: [], models: [{ id: 'first' }, { id: 'last' }] });
  });
});
