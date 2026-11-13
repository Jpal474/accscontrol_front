import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, UrlTree, convertToParamMap } from '@angular/router';
import { EMPTY, of, throwError } from 'rxjs';
import { ProductDetailComponent } from './product-detail.component';
import { ProductsService } from '../../services/products.service';
import { AuthService } from '../../../auth/services/auth.service';
import { SelectedStoreService } from '../../../shared/services/selected-store.service';
import { Product } from '../../interfaces/product.interface';

const product: Product = {
  id: 'real-product', name: 'Producto real', description: 'Datos del servidor', price: '25.50', isActive: true,
  brandId: 'brand', categoryId: 'category', brand: { id: 'brand', name: 'Marca real', isActive: true },
  variations: [{ id: 'variant', productId: 'real-product', sku: 'SKU-REAL', color: 'Negro', price: null, isActive: false }],
};

describe('ProductDetailComponent', () => {
  let fixture: ComponentFixture<ProductDetailComponent>;
  let component: ProductDetailComponent;
  let service: jasmine.SpyObj<ProductsService>;
  let store: SelectedStoreService;
  beforeEach(async () => {
    service = jasmine.createSpyObj('ProductsService', ['get', 'currency']);
    service.get.and.returnValue(of({ success: true, timestamp: '', data: product }));
    service.currency.and.returnValue(of({ success: true, timestamp: '', data: { id: 'currency', code: 'EUR', description: 'Euro' } }));
    const router = jasmine.createSpyObj('Router', ['createUrlTree', 'serializeUrl'], { events: EMPTY });
    router.createUrlTree.and.returnValue(new UrlTree()); router.serializeUrl.and.returnValue('/');
    await TestBed.configureTestingModule({ imports: [ProductDetailComponent], providers: [
      { provide: ProductsService, useValue: service }, { provide: AuthService, useValue: { hasPermission: () => false } },
      { provide: Router, useValue: router },
      { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'real-product' })) } },
    ] }).compileComponents();
    store = TestBed.inject(SelectedStoreService); store.setSelectedStore('store');
    fixture = TestBed.createComponent(ProductDetailComponent); component = fixture.componentInstance;
    TestBed.flushEffects(); fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges();
  });
  afterEach(() => store.setSelectedStore(null));
  it('loads the route ID and renders real fields with store currency', () => {
    expect(service.get).toHaveBeenCalledWith('real-product');
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Producto real'); expect(text).toContain('Marca real'); expect(text).toContain('SKU-REAL');
    expect(text).toContain('€25.50'); expect(text).toContain('Inactiva');
    expect(fixture.nativeElement.querySelector('[href*="edit-product"]')).toBeNull();
  });
  it('clears data on store changes and supports retrying errors', () => {
    service.get.and.returnValue(throwError(() => new Error('not found')));
    store.setSelectedStore('other-store'); TestBed.flushEffects(); fixture.detectChanges();
    expect(component.product()).toBeNull(); expect(component.failed()).toBeTrue();
    service.get.and.returnValue(of({ success: true, timestamp: '', data: product }));
    component.load(); expect(component.failed()).toBeFalse(); expect(component.product()?.id).toBe('real-product');
  });
  it('updates the price and specifications when selecting another variant', () => {
    component.product.set({ ...product, variations: [...product.variations, {
      id: 'blue', productId: product.id, sku: 'SKU-BLUE', color: 'Azul', capacity: '128 GB', price: '49.00', isActive: true,
    }] });
    fixture.detectChanges();
    const choices = fixture.nativeElement.querySelectorAll('.variant-choice') as NodeListOf<HTMLButtonElement>;
    choices[1].click(); fixture.detectChanges();
    expect(component.selectedVariant()?.sku).toBe('SKU-BLUE');
    expect(fixture.nativeElement.querySelector('.product-price').textContent).toContain('€49.00');
    expect(fixture.nativeElement.querySelector('#panel-details').textContent).toContain('128 GB');
    expect(choices[1].getAttribute('aria-pressed')).toBe('true');
  });
  it('shows the placeholder icon for missing images and failed image loads', () => {
    const icon = () => fixture.nativeElement.querySelector('.image-placeholder img') as HTMLImageElement;
    expect(icon().getAttribute('src')).toBe('assets/products/product-placeholder.svg');
    component.product.set({ ...product, image: '/uploads/product.png' }); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.product-photo')).not.toBeNull();
    fixture.nativeElement.querySelector('.product-photo').dispatchEvent(new Event('error')); fixture.detectChanges();
    expect(icon()).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.image-placeholder').textContent).toContain('Imagen no disponible');
  });
  it('supports keyboard navigation between the detail tabs', () => {
    const tabs = fixture.nativeElement.querySelector('[role="tablist"]') as HTMLElement;
    tabs.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })); fixture.detectChanges();
    expect(component.activeTab()).toBe('variants');
    expect(fixture.nativeElement.querySelector('#tab-variants').getAttribute('aria-selected')).toBe('true');
    expect(fixture.nativeElement.querySelector('#panel-variants').hidden).toBeFalse();
    expect(fixture.nativeElement.querySelector('#panel-details').hidden).toBeTrue();
  });
});
