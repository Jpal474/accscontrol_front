import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../../auth/services/auth.service';
import { SelectedStoreService } from '../../../shared/services/selected-store.service';
import { SalesService } from '../../sales.service';
import { SaleDetailComponent } from './sale-detail.component';

describe('SaleDetailComponent', () => {
  it('loads the requested receipt and reflects successful cancellation', async () => {
    const detail = jasmine.createSpy().and.returnValue(of({ data: {
      id: 'sale', folio: '123', status: 'COMPLETED', total: 60, date: '2026-11-21T10:00:00Z',
      saleItems: [{ id: 'item', quantity: 2, unitPrice: 30, productVariation: { sku: 'SKU', product: { name: 'Mica' } } }],
    } }));
    const cancel = jasmine.createSpy().and.returnValue(of({ data: true }));
    TestBed.configureTestingModule({
      imports: [SaleDetailComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ saleId: 'sale' })) } },
        { provide: AuthService, useValue: { hasPermission: (permission: string) => permission === 'cancel_sales' } },
        { provide: SelectedStoreService, useValue: { selectedStoreId: signal('store') } },
        { provide: SalesService, useValue: { detail, cancel } },
      ],
    });
    const fixture = TestBed.createComponent(SaleDetailComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(detail).toHaveBeenCalledOnceWith('sale');
    expect(fixture.nativeElement.querySelector('.receipt').textContent).toContain('Mica');

    fixture.componentInstance.cancel();
    fixture.detectChanges();
    expect(cancel).toHaveBeenCalledOnceWith('sale');
    expect(fixture.nativeElement.querySelector('.receipt').textContent).toContain('Venta cancelada');
  });
});
