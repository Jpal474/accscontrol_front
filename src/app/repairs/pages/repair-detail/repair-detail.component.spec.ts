import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../../auth/services/auth.service';
import { SelectedStoreService } from '../../../shared/services/selected-store.service';
import { RepairsService } from '../../repairs.service';
import { RepairDetailComponent } from './repair-detail.component';

describe('RepairDetailComponent', () => {
  it('validates and sends the quantity and physical origin selected by the assigned technician', async () => {
    const params = convertToParamMap({ repairId: 'repair' });
    const repair = { id: 'repair', technicianId: 'tech', isActive: true, price: '50', description: 'Equipo' };
    const item = { productVariationId: 'variant', productName: 'Conector', sku: 'ABC',
      trackSerialNumbers: false, locations: [{ id: 'location', code: 'A1', description: '', existence: 2 }] };
    const consume = jasmine.createSpy().and.returnValue(of({ data: { processedItemsCount: 1 } }));
    TestBed.configureTestingModule({
      imports: [RepairDetailComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: of(params), snapshot: { paramMap: params } } },
        { provide: AuthService, useValue: {
          hasPermission: (permission: string) => permission === 'update_assigned_repairs',
          currentUser: signal({ id: 'tech' }),
        } },
        { provide: SelectedStoreService, useValue: { selectedStoreId: signal('store') } },
        { provide: RepairsService, useValue: {
          detail: () => of({ data: { repair, parts: [] } }),
          lookups: () => of({ data: { states: [] } }),
          stock: () => of({ data: [item] }),
          consume,
        } },
      ],
    });
    const fixture = TestBed.createComponent(RepairDetailComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const detail = fixture.componentInstance;
    detail.searchStock();
    detail.chooseStock('variant:location');
    detail.parts.controls.quantity.setValue(3);
    detail.consume();
    expect(consume).not.toHaveBeenCalled();
    expect(detail.stockError()).toContain('piezas disponibles');

    detail.parts.controls.quantity.setValue(2);
    detail.consume();
    expect(consume).toHaveBeenCalledOnceWith('repair', { productVariationId: 'variant', locationId: 'location', quantity: 2 });
  });
});
