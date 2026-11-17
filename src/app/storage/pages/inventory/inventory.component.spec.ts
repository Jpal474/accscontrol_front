import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { InventoryComponent } from './inventory.component';
import { InventoryService } from '../../services/inventory.service';
import { AuthService } from '../../../auth/services/auth.service';
import { SelectedStoreService } from '../../../shared/services/selected-store.service';
import { ToastService } from '../../../shared/services/toast.service';
import { MovementReason, MovementType, StockBalance } from '../../interfaces/inventory.interface';

const variant = { id: 'variant', sku: 'PHONE', productName: 'Phone', color: 'Negro', trackSerialNumbers: true, isActive: true };
const balance: StockBalance = { ...variant, productVariationId: variant.id, productId: 'product', existence: 2 };
const response = <T>(data: T) => ({ success: true, timestamp: '', data, meta: { total: 21, totalPages: 3, page: 1, pageSize: 10 } });

describe('InventoryComponent', () => {
  let fixture: ComponentFixture<InventoryComponent>;
  let component: InventoryComponent;
  let service: jasmine.SpyObj<InventoryService>;
  let store: SelectedStoreService;
  let manage = true;
  beforeEach(async () => {
    manage = true;
    service = jasmine.createSpyObj('InventoryService', ['stock', 'movements', 'variants', 'transferTargets', 'units', 'add', 'discount', 'transfer', 'locations', 'sales']);
    service.locations.and.callFake(target => of([{ id: target ? 'target-location' : 'source-location', code: 'A1', description: 'Estante', existence: target ? 0 : 5, locationCategory: { name: 'Bodega' } }]));
    service.sales.and.returnValue(of(response([])));
    service.stock.and.returnValue(of(response([balance]))); service.movements.and.returnValue(of(response([])));
    service.variants.and.returnValue(of([variant])); service.transferTargets.and.returnValue(of([{ id: 'target', name: 'Otra tienda' }]));
    service.units.and.returnValue(of(response([{ id: 'unit', serialNumber: 'SN-1', productVariationId: 'variant', status: 'AVAILABLE' as const }])));
    service.add.and.returnValue(of(response({ processedItemsCount: 1 })));
    service.discount.and.returnValue(of(response({ processedItemsCount: 1 })));
    service.transfer.and.returnValue(of(response({ processedItemsCount: 1 })));
    await TestBed.configureTestingModule({ imports: [InventoryComponent], providers: [
      { provide: InventoryService, useValue: service },
      { provide: AuthService, useValue: { hasPermission: (key: string) => key === 'view_inventory' || manage } },
      { provide: ToastService, useValue: { show: jasmine.createSpy() } },
    ] }).compileComponents();
    store = TestBed.inject(SelectedStoreService); store.setSelectedStore('store');
    fixture = TestBed.createComponent(InventoryComponent); component = fixture.componentInstance;
    TestBed.flushEffects(); fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges();
  });
  afterEach(() => store?.setSelectedStore(null));
  function item(serialText = 'sn-1\nsn-2', quantity = 2) {
    component.loadVariants(); component.items.at(0).controls.variantId.setValue(variant.id); component.loadLocations();
    component.items.at(0).patchValue({ variantId: variant.id, locationId: 'source-location', quantity, serialText });
  }
  it('loads actual balances and removes unsupported and position-related sections', () => {
    expect(component.balances()[0].existence).toBe(2);
    expect(component.tabs.map(tab => tab.id)).toEqual(['balances', 'movements']);
    expect(fixture.nativeElement.textContent).not.toMatch(/Ubicaciones|Posición|Reservas|Conteos|Modo Cascar/);
  });
  it('sends one normalized serial per purchased physical unit without position fields', () => {
    item(); component.saveOperation();
    expect(service.add).toHaveBeenCalledWith({ reason: MovementReason.PURCHASE, notes: undefined, saleId: undefined,
      items: [{ productVariationId: 'variant', locationId: 'source-location', quantity: 2, serialNumbers: ['SN-1', 'SN-2'] }] });
  });
  it('rejects missing or repeated serials before sending stock mutations', () => {
    item('SN-1', 2); component.saveOperation(); expect(service.add).not.toHaveBeenCalled();
    item('sn-1,SN-1', 2); component.saveOperation(); expect(service.add).not.toHaveBeenCalled();
    expect(component.error()).toBeTruthy();
  });
  it('selects the discount or transfer endpoint and uses the matching enums', () => {
    component.operation.controls.action.setValue(MovementType.OUT); component.operation.controls.reason.setValue(MovementReason.SALE); item(); component.saveOperation();
    expect(service.discount).toHaveBeenCalledWith(jasmine.objectContaining({ reason: MovementReason.SALE }));
    component.loadTargets(); component.operation.patchValue({ action: 'TRANSFER', targetStoreId: 'target' }); item(); component.loadTargetLocations(); component.items.at(0).controls.targetLocationId.setValue('target-location'); component.saveOperation();
    expect(service.transfer).toHaveBeenCalledWith('target', jasmine.objectContaining({ reason: MovementReason.TRANSFER }));
  });
  it('paginates actual results and applies movement filters', () => {
    component.next(1); expect(service.stock).toHaveBeenCalledWith(jasmine.objectContaining({ page: 2 }));
    component.typeFilter = MovementType.OUT; component.reasonFilter = MovementReason.DAMAGE;
    component.choose('movements'); TestBed.flushEffects();
    expect(service.movements).toHaveBeenCalledWith(jasmine.objectContaining({ type: MovementType.OUT, reason: MovementReason.DAMAGE, page: 1 }));
  });
  it('blocks viewers and ignores operation responses from another store', () => {
    manage = false; item(); component.saveOperation(); expect(service.add).not.toHaveBeenCalled();
    fixture.detectChanges(); expect(fixture.nativeElement.querySelector('.editor-section')).toBeNull();
  });
  it('shows available serials and clears the dialog when changing stores', () => {
    component.openUnits(balance); fixture.detectChanges();
    expect(service.units).toHaveBeenCalledWith(jasmine.objectContaining({ productVariationId: 'variant' }));
    expect(component.unitDialog()!.nativeElement.open).toBeTrue();
    expect(component.units()[0].serialNumber).toBe('SN-1');
    store.setSelectedStore('other'); TestBed.flushEffects();
    expect(component.unitDialog()!.nativeElement.open).toBeFalse();
  });
  it('keeps entered data after a backend error', () => {
    item(); service.add.and.returnValue(throwError(() => ({ error: { message: 'Serie ya registrada' } })));
    component.saveOperation(); expect(component.error()).toBe('Serie ya registrada');
    expect(component.items.at(0).controls.serialText.value).toContain('sn-1'); expect(component.busy()).toBeFalse();
  });
  it('loads source and destination locations only when opening their selectors', () => {
    expect(service.locations).not.toHaveBeenCalled();
    component.items.at(0).controls.variantId.setValue(variant.id);
    fixture.nativeElement.querySelector('select[formControlName="locationId"]').click();
    expect(service.locations).toHaveBeenCalledOnceWith(undefined, 'variant', false);
    component.operation.controls.action.setValue('TRANSFER'); component.loadTargets();
    component.operation.controls.targetStoreId.setValue('target'); fixture.detectChanges();
    expect(service.locations).toHaveBeenCalledTimes(1);
    fixture.nativeElement.querySelector('select[formControlName="targetLocationId"]').click();
    expect(service.locations).toHaveBeenCalledWith('target', 'variant', false);
    component.items.at(0).controls.targetLocationId.setValue('target-location');
    component.operation.controls.targetStoreId.setValue('');
    expect(component.items.at(0).controls.targetLocationId.value).toBe(''); expect(component.targetLocations()).toEqual([]);
  });
  it('requires physical locations and includes both ends of a transfer', () => {
    item(); component.items.at(0).controls.locationId.setValue(''); component.saveOperation();
    expect(service.add).not.toHaveBeenCalled();
    component.items.at(0).controls.locationId.setValue('source-location');
    component.loadTargets(); component.operation.patchValue({ action: 'TRANSFER', targetStoreId: 'target' });
    component.saveOperation(); expect(service.transfer).not.toHaveBeenCalled();
    component.loadLocations(); component.items.at(0).controls.locationId.setValue('source-location');
    component.loadTargetLocations(); component.items.at(0).controls.targetLocationId.setValue('target-location');
    expect(component.summary()[0].targetLocation).toContain('A1');
    component.saveOperation();
    expect(service.transfer).toHaveBeenCalledWith('target', jasmine.objectContaining({
      items: [{ productVariationId: 'variant', quantity: 2, locationId: 'source-location', targetLocationId: 'target-location', serialNumbers: ['SN-1', 'SN-2'] }],
    }));
  });
  it('shows each physical stock location and keeps serial access beside the SKU', () => {
    component.balances.set([{ ...balance, locations: [
      { id: 'shelf', code: 'A1', description: 'Estante principal', categoryName: 'Bodega', existence: 1 },
      { id: 'counter', code: 'V1', description: 'Vitrina', categoryName: 'Mostrador', existence: 1 },
    ] }]); fixture.detectChanges();
    const table = fixture.nativeElement.querySelector('table');
    expect(table.textContent).toContain('Ubicación física'); expect(table.textContent).not.toContain('Control de unidades');
    expect(table.querySelector('.physical-location').textContent).toContain('Bodega / A1 · Estante principal');
    expect(table.querySelector('.physical-location').textContent).toContain('Mostrador / V1 · Vitrina');
    expect(table.querySelector('td:first-child .series-link')).not.toBeNull();
  });
  it('does not present the automatic internal record as a physical position', () => {
    component.balances.set([{ ...balance, locations: [{ id: 'general', code: '__INVENTORY_GENERAL__', description: 'General inventory', existence: 2 }] }]);
    fixture.detectChanges();
    const cell = fixture.nativeElement.querySelector('.physical-location');
    expect(cell.textContent).toContain('Sin ubicación física asignada'); expect(cell.textContent).not.toContain('__INVENTORY_GENERAL__');
  });
  it('loads each selector only on opening and reuses its data for the active store', () => {
    expect(service.variants).not.toHaveBeenCalled(); expect(service.transferTargets).not.toHaveBeenCalled();
    component.operation.controls.action.setValue('TRANSFER'); fixture.detectChanges();
    expect(service.transferTargets).not.toHaveBeenCalled();
    fixture.nativeElement.querySelector('select[formControlName="variantId"]').click();
    expect(service.variants).toHaveBeenCalledTimes(1); expect(service.transferTargets).not.toHaveBeenCalled();
    fixture.nativeElement.querySelector('select[formControlName="targetStoreId"]').click();
    expect(service.transferTargets).toHaveBeenCalledTimes(1);
    component.loadVariants(); component.loadTargets();
    expect(service.variants).toHaveBeenCalledTimes(1); expect(service.transferTargets).toHaveBeenCalledTimes(1);
    store.setSelectedStore('other'); TestBed.flushEffects();
    expect(service.variants).toHaveBeenCalledTimes(1); expect(service.transferTargets).toHaveBeenCalledTimes(1);
    component.loadVariants(); expect(service.variants).toHaveBeenCalledTimes(2);
  });
  it('does not load options when tabbing through closed selectors', () => {
    component.lookupKeydown(new KeyboardEvent('keydown', { key: 'Tab' }), 'variants');
    expect(service.variants).not.toHaveBeenCalled();
  });
  it('keeps a live summary of all lines, quantities, and serial validation', () => {
    item(); component.addItem();
    component.items.at(1).patchValue({ variantId: 'variant', locationId: 'source-location', quantity: 1, serialText: 'THREE' });
    expect(component.summary()).toHaveSize(2); expect(component.totalUnits()).toBe(3); expect(component.pendingItems()).toBe(0);
    component.items.at(1).controls.serialText.setValue('SN-1');
    expect(component.pendingItems()).toBe(2);
    component.removeItem(1); expect(component.totalUnits()).toBe(2); expect(component.pendingItems()).toBe(0);
  });
  it('allows jumping directly from the summary to a line in the scroll region', () => {
    item(); component.addItem(); fixture.detectChanges();
    const field = fixture.nativeElement.querySelector('#inventory-item-1') as HTMLElement;
    const scroll = spyOn(field, 'scrollIntoView');
    component.focusItem(1); expect(scroll).toHaveBeenCalled(); expect(component.highlightedItem()).toBe(1);
    expect(getComputedStyle(fixture.nativeElement.querySelector('.operation-items')).overflowY).toBe('auto');
  });
  it('requests positive source stock per variant and clears stale selections on variant changes', () => {
    component.operation.controls.action.setValue(MovementType.OUT);
    component.loadLocations(); expect(service.locations).not.toHaveBeenCalled();
    item(); expect(service.locations).toHaveBeenCalledWith(undefined, 'variant', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('select[formControlName="locationId"]').textContent).toContain('5 uds.');
    component.items.at(0).controls.variantId.setValue('second-variant');
    expect(component.items.at(0).controls.locationId.value).toBe('');
    expect(component.options(0)).toEqual([]);
    expect(service.locations).toHaveBeenCalledTimes(1);
    component.loadLocations(); expect(service.locations).toHaveBeenCalledWith(undefined, 'second-variant', true);
  });
  it('rejects combined outgoing quantities exceeding stock at the selected location', () => {
    component.operation.controls.action.setValue(MovementType.OUT); component.operation.controls.reason.setValue(MovementReason.DAMAGE); item('ONE,TWO,THREE', 3);
    component.addItem(); component.items.at(1).patchValue({ variantId: 'variant', locationId: 'source-location', quantity: 3, serialText: 'FOUR,FIVE,SIX' });
    component.saveOperation(); expect(service.discount).not.toHaveBeenCalled(); expect(component.error()).toContain('existencias');
  });

  it('shows the lazy sale selector only for sale or return reasons and clears hidden references', () => {
    expect(fixture.nativeElement.querySelector('app-inventory-sale-selector')).toBeNull();
    component.operation.controls.action.setValue(MovementType.OUT); fixture.detectChanges();
    expect(component.operation.controls.reason.value).toBe('');
    expect(fixture.nativeElement.querySelector('app-inventory-sale-selector')).toBeNull();
    item(); component.saveOperation();
    expect(service.discount).not.toHaveBeenCalled();
    component.operation.controls.reason.setValue(MovementReason.SALE); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-inventory-sale-selector')).not.toBeNull();
    expect(service.sales).not.toHaveBeenCalled();
    component.operation.controls.saleId.setValue('sale');
    component.operation.controls.reason.setValue(MovementReason.RETURN); fixture.detectChanges();
    expect(component.operation.controls.saleId.value).toBe('');
    expect(fixture.nativeElement.querySelector('app-inventory-sale-selector')).not.toBeNull();
    component.operation.controls.reason.setValue(MovementReason.DAMAGE); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-inventory-sale-selector')).toBeNull();
  });
  it('sends the selected sale ID only for eligible movement reasons', () => {
    item(); component.operation.controls.reason.setValue(MovementReason.RETURN); component.operation.controls.saleId.setValue('sale');
    component.saveOperation(); expect(service.add).toHaveBeenCalledWith(jasmine.objectContaining({ saleId: 'sale', reason: MovementReason.RETURN }));
    item(); component.operation.controls.saleId.setValue('stale-sale'); component.saveOperation();
    expect(service.add.calls.mostRecent().args[0].saleId).toBeUndefined();
  });

});
