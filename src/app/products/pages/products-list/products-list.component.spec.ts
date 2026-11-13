import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, UrlTree } from '@angular/router';
import { EMPTY, of } from 'rxjs';
import { ProductsListComponent } from './products-list.component';
import { ProductsService } from '../../services/products.service';
import { SelectedStoreService } from '../../../shared/services/selected-store.service';
import { AuthService } from '../../../auth/services/auth.service';
import { ToastService } from '../../../shared/services/toast.service';
import { Product } from '../../interfaces/product.interface';

const product: Product = {
  id: 'product', name: 'Funda', description: '', price: 100, isActive: true,
  categoryId: 'category', brandId: 'brand', compatibleModels: [], image: '/uploads/products/funda.png',
  variations: [{ id: 'variant', productId: 'product', color: 'Negro', sku: 'BLACK', isActive: false, price: null }],
};

describe('ProductsListComponent', () => {
  let fixture: ComponentFixture<ProductsListComponent>;
  let component: ProductsListComponent;
  let service: jasmine.SpyObj<ProductsService>;
  let store: SelectedStoreService;
  let router: jasmine.SpyObj<Router>;

  async function create(canManage = true) {
    service = jasmine.createSpyObj('ProductsService', ['list', 'lookups', 'update', 'toggleVariation', 'currency', 'brands', 'categories']);
    service.currency.and.returnValue(of({ success: true, timestamp: '', data: { id: 'currency', code: 'MXN', description: 'Peso mexicano' } }));
    service.brands.and.returnValue(of([{ id: 'brand', name: 'Marca', isActive: true }]));
    service.categories.and.returnValue(of([]));
    service.list.and.returnValue(of({ success: true, timestamp: '', data: [product], meta: { total: 1, page: 1, pageSize: 10, totalPages: 1 } }));
    service.lookups.and.returnValue(of({ categories: [], brands: [], models: [] }));
    service.update.and.returnValue(of({ success: true, timestamp: '', data: product }));
    service.toggleVariation.and.returnValue(of({ success: true, timestamp: '', data: true }));
    router = jasmine.createSpyObj('Router', ['navigate', 'createUrlTree', 'serializeUrl'], { events: EMPTY });
    router.navigate.and.resolveTo(true); router.createUrlTree.and.returnValue(new UrlTree()); router.serializeUrl.and.returnValue('/');
    await TestBed.configureTestingModule({ imports: [ProductsListComponent], providers: [
      { provide: ProductsService, useValue: service }, { provide: Router, useValue: router },
      { provide: ActivatedRoute, useValue: {} },
      { provide: AuthService, useValue: { hasPermission: () => canManage } },
      { provide: ToastService, useValue: { show: jasmine.createSpy() } },
    ] }).compileComponents();
    store = TestBed.inject(SelectedStoreService); store.setSelectedStore('store');
    fixture = TestBed.createComponent(ProductsListComponent); component = fixture.componentInstance;
    TestBed.flushEffects();
    fixture.detectChanges();
  }
  afterEach(() => store?.setSelectedStore(null));

  it('opens the image modal from the base product name even for a viewer', async () => {
    await create(false);
    await fixture.whenStable(); fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('tbody .cell-action') as HTMLButtonElement;
    expect(button).withContext(fixture.nativeElement.innerHTML).not.toBeNull();
    expect(button.textContent?.trim()).toBe('Funda');
    expect(fixture.nativeElement.querySelectorAll('tbody .cell-action').length).toBe(1);
    button.click(); fixture.detectChanges();
    const modal = component.imageModal()!.nativeElement;
    expect(modal.open).toBeTrue();
    expect(modal.querySelector('h2')?.textContent).toBe('Funda');
    expect(modal.querySelector('img')?.getAttribute('src')).toBe('http://localhost:3000/uploads/products/funda.png');
    component.closeImage(); expect(modal.open).toBeFalse();
  });

  it('shows a fallback for a product without an image and closes on store change', async () => {
    await create(false); component.products.set([{ ...product, image: undefined }]);
    component.handleAction({ action: 'preview', row: { id: product.id } }); fixture.detectChanges();
    expect(component.imageModal()!.nativeElement.textContent).toContain('Este producto no tiene imagen');
    store.setSelectedStore('other'); TestBed.flushEffects();
    expect(component.imageModal()!.nativeElement.open).toBeFalse();
    expect(component.preview()).toBeNull();
  });

  it('lists the product and inactive variants, with the base price as fallback', async () => {
    await create(); expect(component.rows().length).toBe(2);
    expect(component.rows()[1]).toEqual(jasmine.objectContaining({ sku: 'BLACK', price: '$100.00', status: 'Inactiva' }));
  });
  it('hides mutation actions and blocks handlers for a viewer', async () => {
    await create(false); expect(component.actions()).toEqual([{ key: 'detail', label: 'Ver detalles' }]);
    component.handleAction({ action: 'edit', row: { id: 'product' } });
    expect(router.navigate).not.toHaveBeenCalled();
  });
  it('opens the editor at the selected variation', async () => {
    await create(); component.handleAction({ action: 'edit', row: { id: 'variant' } });
    expect(router.navigate).toHaveBeenCalledWith(['/app/edit-product', 'product'], { queryParams: { variation: 'variant' } });
  });
  it('loads filter choices only on interaction and caches them for the current store', async () => {
    await create(); await fixture.whenStable(); fixture.detectChanges();
    expect(service.lookups).not.toHaveBeenCalled(); expect(service.brands).not.toHaveBeenCalled(); expect(service.categories).not.toHaveBeenCalled();
    fixture.nativeElement.querySelector('select[formControlName="brandId"]').click();
    component.loadLookup('brands');
    expect(service.brands).toHaveBeenCalledTimes(1); expect(service.categories).not.toHaveBeenCalled();
    store.setSelectedStore('other'); TestBed.flushEffects(); component.loadLookup('brands');
    expect(service.brands).toHaveBeenCalledTimes(2);
  });
  it('opens the real detail route for viewers', async () => {
    await create(false); component.handleAction({ action: 'detail', row: { id: 'product' } });
    expect(router.navigate).toHaveBeenCalledWith(['/app/product-detail', 'product']);
  });
  it('keeps previous and next pagination buttons on one row at a narrow width', async () => {
    await create(); await fixture.whenStable(); fixture.detectChanges();
    fixture.nativeElement.style.display = 'block'; fixture.nativeElement.style.width = '320px';
    const buttons = fixture.nativeElement.querySelectorAll('.pagination button') as NodeListOf<HTMLButtonElement>;
    expect(Math.abs(buttons[0].getBoundingClientRect().top - buttons[1].getBoundingClientRect().top)).toBeLessThan(1);
  });
  it('uses the variation toggle endpoint and rejects a stale store confirmation', async () => {
    await create(); component.pending.set({ row: component.rows()[1], storeId: 'store' });
    component.toggle(); expect(service.toggleVariation).toHaveBeenCalledOnceWith('variant');
    component.pending.set({ row: component.rows()[0], storeId: 'previous-store' });
    component.toggle(); expect(service.update).not.toHaveBeenCalled();
  });
});
