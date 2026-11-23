import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../../auth/services/auth.service';
import { ProductsService } from '../../../products/services/products.service';
import { SelectedStoreService } from '../../../shared/services/selected-store.service';
import { SalesService } from '../../sales.service';
import { CheckoutComponent } from './checkout.component';

describe('CheckoutComponent', () => {
  it('requires serials and a payment method before registering the sale', () => {
    const create = jasmine.createSpy().and.returnValue(of({ data: { id: 'sale', folio: '123', total: '49.90' } }));
    TestBed.configureTestingModule({
      imports: [CheckoutComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { hasPermission: () => false } },
        { provide: SelectedStoreService, useValue: { selectedStoreId: signal('store') } },
        { provide: ProductsService, useValue: {} },
        { provide: SalesService, useValue: {
          products: () => of({ data: [] }),
          paymentMethods: () => of([{ id: 'cash', name: 'Efectivo' }]),
          create,
        } },
      ],
    });
    const fixture = TestBed.createComponent(CheckoutComponent);
    fixture.detectChanges();
    const checkout = fixture.componentInstance;
    checkout.add({
      productId: 'product', productVariationId: 'variant', productName: 'Teléfono',
      sku: 'TEL', color: '', isActive: true, trackSerialNumbers: true, existence: 2, price: '49.90',
    });
    checkout.complete();
    expect(create).not.toHaveBeenCalled();
    expect(checkout.lineErrors()[0]).toContain('número de serie');

    checkout.updateLine('variant', { serialText: ' serie-001 ' });
    checkout.paymentMethodId = 'cash';
    checkout.complete();
    expect(create).toHaveBeenCalledOnceWith({
      paymentMethodId: 'cash', description: undefined,
      items: [{ productVariationId: 'variant', quantity: 1, serialNumbers: ['SERIE-001'] }],
    });
    expect(checkout.sale()?.folio).toBe('123');
  });
});
