import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { InventoryService } from './inventory.service';
import { MovementReason, MovementType } from '../interfaces/inventory.interface';
import { environment } from '../../../environments/environment.development';

describe('InventoryService', () => {
  let service: InventoryService;
  let http: HttpTestingController;
  const base = `${environment.apiUrl}inventory`;
  beforeEach(() => { TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] }); service = TestBed.inject(InventoryService); http = TestBed.inject(HttpTestingController); });
  afterEach(() => http.verify());
  it('sends the selected variant and stock filter for source locations', () => {
    service.locations(undefined, 'variant', true).subscribe(locations => expect(locations[0].existence).toBe(4));
    const req = http.expectOne(request => request.url === `${base}/movement-locations`);
    expect(req.request.params.get('productVariationId')).toBe('variant');
    expect(req.request.params.get('onlyWithStock')).toBe('true');
    req.flush({ data: [{ id: 'shelf', existence: 4 }] });
  });
  it('loads destination locations through the source-scoped authorized endpoint', () => {
    service.locations('target').subscribe(locations => expect(locations[0].code).toBe('B1'));
    http.expectOne(request => request.url === `${base}/transfer/target/locations` && request.params.get('page') === '1')
      .flush({ success: true, data: [{ id: 'place', code: 'B1', description: 'Vitrina' }] });
  });
  it('uses controller endpoints and preserves exact movement enum values', () => {
    service.movements({ page: 2, type: MovementType.OUT, reason: MovementReason.SALE }).subscribe();
    const req = http.expectOne(request => request.url === `${base}/movements/list`);
    expect(req.request.params.get('page')).toBe('2'); expect(req.request.params.get('type')).toBe('OUT'); expect(req.request.params.get('reason')).toBe('SALE');
    req.flush({ data: [], success: true });
  });
  it('posts per-unit serial numbers through the existing bulk transfer endpoint', () => {
    const body = { reason: MovementReason.TRANSFER, items: [{ productVariationId: 'variant', locationId: 'source-location', targetLocationId: 'target-location', quantity: 2, serialNumbers: ['ONE', 'TWO'] }] };
    service.transfer('target', body).subscribe(); const req = http.expectOne(`${base}/transfer/target`);
    expect(req.request.method).toBe('POST'); expect(req.request.body).toEqual(body); req.flush({ data: { processedItemsCount: 1 } });
  });
  it('searches sale options only by folio and requests a bounded page', () => {
    service.sales('V-10584', 2).subscribe();
    const req = http.expectOne(request => request.url === `${base}/sales/list`);
    expect(req.request.params.get('folio')).toBe('V-10584'); expect(req.request.params.has('search')).toBeFalse();
    expect(req.request.params.get('page')).toBe('2'); expect(req.request.params.get('pageSize')).toBe('5');
    req.flush({ data: [] });
  });

});
