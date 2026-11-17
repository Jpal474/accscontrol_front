import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { InventorySaleSelectorComponent } from './inventory-sale-selector.component';
import { InventoryService } from '../../services/inventory.service';
import { SelectedStoreService } from '../../../shared/services/selected-store.service';
const sale = { id: 'sale', folio: 'V-10584', date: '2026-11-17T12:00:00Z', total: '1349.00', currency: 'MXN', itemCount: 2, products: ['Mouse', 'Teclado'] };
const response = (data = [sale], page = 1) => ({ success: true, timestamp: '', data, meta: { total: 6, totalPages: 2, page, pageSize: 5 } });
describe('InventorySaleSelectorComponent', () => {
  let fixture: ComponentFixture<InventorySaleSelectorComponent>;
  let component: InventorySaleSelectorComponent;
  let service: jasmine.SpyObj<InventoryService>;
  let store: SelectedStoreService;
  beforeEach(() => {
    service = jasmine.createSpyObj('InventoryService', ['sales']); service.sales.and.returnValue(of(response()));
    TestBed.configureTestingModule({ imports: [InventorySaleSelectorComponent], providers: [{ provide: InventoryService, useValue: service }] });
    store = TestBed.inject(SelectedStoreService); store.setSelectedStore('store');
    fixture = TestBed.createComponent(InventorySaleSelectorComponent); component = fixture.componentInstance;
    fixture.detectChanges(); TestBed.flushEffects();
  });
  afterEach(() => store.setSelectedStore(null));
  it('loads only on focus and displays folio, products and currency', fakeAsync(() => {
    expect(service.sales).not.toHaveBeenCalled();
    fixture.nativeElement.querySelector('input').dispatchEvent(new FocusEvent('focus')); tick(); fixture.detectChanges();
    expect(service.sales).toHaveBeenCalledOnceWith('', 1);
    expect(fixture.nativeElement.textContent).toContain('V-10584'); expect(fixture.nativeElement.textContent).toContain('Mouse, Teclado');
    expect(fixture.nativeElement.textContent).toContain('$1,349.00');
  }));
  it('debounces folio search and cancels stale responses', fakeAsync(() => {
    const stale = new Subject<ReturnType<typeof response>>(); service.sales.and.returnValue(stale);
    component.focus(); tick();
    service.sales.and.returnValue(of(response([{ ...sale, id: 'new', folio: 'V-10585' }])));
    component.search('V-1058'); tick(100); component.search('V-10585'); tick(249);
    expect(service.sales).toHaveBeenCalledTimes(1); tick(1);
    expect(service.sales).toHaveBeenCalledWith('V-10585', 1);
    stale.next(response()); expect(component.sales()[0].folio).toBe('V-10585');
  }));
  it('selects an actual sale ID, clears it when typing and supports more results', fakeAsync(() => {
    const emit = spyOn(component.saleIdChange, 'emit');
    component.focus(); tick(); component.load(2); tick(); expect(service.sales).toHaveBeenCalledWith('', 2);
    component.choose(sale); expect(emit).toHaveBeenCalledWith('sale'); expect(component.open()).toBeFalse();
    component.search('1058'); expect(emit).toHaveBeenCalledWith(''); tick(250);
  }));
  it('cancels the previous store request and resets the selection without loading automatically', fakeAsync(() => {
    const pending = new Subject<ReturnType<typeof response>>(); service.sales.and.returnValue(pending);
    component.focus(); tick(); store.setSelectedStore('another'); TestBed.flushEffects();
    pending.next(response()); expect(component.sales()).toEqual([]); expect(component.open()).toBeFalse();
    expect(service.sales).toHaveBeenCalledTimes(1);
  }));
  it('shows errors and allows retry without losing the folio query', fakeAsync(() => {
    service.sales.and.returnValue(throwError(() => new Error('network')));
    component.search('10584'); tick(250); expect(component.failed()).toBeTrue();
    service.sales.and.returnValue(of(response())); component.load(); tick(); expect(component.failed()).toBeFalse();
    expect(service.sales).toHaveBeenCalledWith('10584', 1);
  }));
});
