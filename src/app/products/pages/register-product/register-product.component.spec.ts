import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, UrlTree, convertToParamMap } from '@angular/router';
import { EMPTY, of, throwError } from 'rxjs';
import { RegisterProductComponent } from './register-product.component';
import { ProductsService } from '../../services/products.service';
import { AuthService } from '../../../auth/services/auth.service';
import { SelectedStoreService } from '../../../shared/services/selected-store.service';
import { ToastService } from '../../../shared/services/toast.service';
import { Product } from '../../interfaces/product.interface';

const product: Product = {
  id: 'product', name: 'Funda', description: 'Protectora', price: '100.00', isActive: true,
  categoryId: 'category', brandId: 'brand', compatibleModels: [], image: '/uploads/products/old.png',
  variations: [{ id: 'variant', productId: 'product', sku: 'BLACK', color: 'Negro', isActive: true, price: null }],
};
const response = { success: true, timestamp: '', data: product };

describe('RegisterProductComponent', () => {
  let fixture: ComponentFixture<RegisterProductComponent>;
  let component: RegisterProductComponent;
  let service: jasmine.SpyObj<ProductsService>;
  let store: SelectedStoreService;
  let router: jasmine.SpyObj<Router>;
  let canManage = true;

  async function create(id: string | null = null) {
    service = jasmine.createSpyObj('ProductsService', ['lookups', 'get', 'create', 'update', 'addCompatibilities', 'removeCompatibilities', 'currency']);
    service.currency.and.returnValue(of({ success: true, timestamp: '', data: { id: 'currency', code: 'EUR', description: 'Euro' } }));
    service.lookups.and.returnValue(of({ categories: [], brands: [], models: [{ id: 'model', model: 'Phone', isActive: true }] }));
    service.get.and.returnValue(of(response)); service.create.and.returnValue(of(response)); service.update.and.returnValue(of(response));
    service.addCompatibilities.and.returnValue(of({ success: true, timestamp: '', data: { createdCount: 1 } }));
    router = jasmine.createSpyObj('Router', ['navigate', 'createUrlTree', 'serializeUrl'], { events: EMPTY });
    router.createUrlTree.and.returnValue(new UrlTree()); router.serializeUrl.and.returnValue('/');
    router.navigate.and.resolveTo(true);
    await TestBed.configureTestingModule({ imports: [RegisterProductComponent], providers: [
      { provide: ProductsService, useValue: service },
      { provide: AuthService, useValue: { hasPermission: () => canManage } },
      { provide: ToastService, useValue: { show: jasmine.createSpy() } },
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}), queryParamMap: convertToParamMap({}) } } },
      { provide: Router, useValue: router },
    ] }).compileComponents();
    store = TestBed.inject(SelectedStoreService); store.setSelectedStore('store');
    fixture = TestBed.createComponent(RegisterProductComponent); component = fixture.componentInstance;
    TestBed.flushEffects();
    fixture.detectChanges();
  }

  beforeEach(() => { canManage = true; });
  afterEach(() => { store?.setSelectedStore(null); });

  function completeForm() {
    component.form.patchValue({ name: 'Funda', description: '', price: '100.00', categoryId: 'category', brandId: 'brand' });
    component.variants.at(0).patchValue({ sku: 'BLACK', color: 'Negro' });
  }

  function chooseImage(file: File) {
    const input = fixture.nativeElement.querySelector('#product-image') as HTMLInputElement;
    const data = new DataTransfer(); data.items.add(file); input.files = data.files;
    input.dispatchEvent(new Event('change'));
  }

  it('keeps the existing image unless a replacement is selected', async () => {
    await create('product');
    expect(component.imagePreview()).toBe('http://localhost:3000/uploads/products/old.png');
    chooseImage(new File(['image'], 'new.png', { type: 'image/png' }));
    expect(component.imagePreview()?.startsWith('blob:')).toBeTrue();
    component.clearSelectedImage();
    expect(component.imagePreview()).toBe('http://localhost:3000/uploads/products/old.png');
    await component.save();
    expect(service.update).toHaveBeenCalledWith('product', jasmine.any(Object));
  });

  it('sends the image only with the base product', async () => {
    await create(); completeForm();
    const file = new File(['image'], 'new.webp', { type: 'image/webp' });
    chooseImage(file); await component.save();
    expect(service.create).toHaveBeenCalledWith(jasmine.objectContaining({ variations: [jasmine.objectContaining({ sku: 'BLACK' })] }), file);
  });

  it('rejects unsupported and oversized images', async () => {
    await create();
    chooseImage(new File(['text'], 'image.svg', { type: 'image/svg+xml' }));
    expect(component.imageError()).toContain('5 MB'); expect(component.imagePreview()).toBeNull();
    chooseImage(new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'big.png', { type: 'image/png' }));
    expect(component.imageError()).toBeTruthy(); expect(component.imagePreview()).toBeNull();
  });

  it('keeps one variant and rejects a form with no variants', async () => {
    await create(); component.removeVariant(0); expect(component.variants.length).toBe(1);
    completeForm(); component.variants.clear(); await component.save();
    expect(service.create).not.toHaveBeenCalled(); expect(component.error()).toBeTruthy();
  });
  it('uses the store currency symbol in base and variation price labels', async () => {
    await create(); await fixture.whenStable(); fixture.detectChanges();
    expect(component.currencySymbol()).toBe('€');
    const labels = Array.from(fixture.nativeElement.querySelectorAll('label')) as HTMLLabelElement[];
    expect(labels.find(label => label.textContent?.includes('Precio base'))?.textContent).toContain('€ (EUR)');
    expect(labels.find(label => label.textContent?.includes('Precio de la variante'))?.textContent).toContain('€ (EUR)');
  });

  it('saves the entered variants together without a synthetic default', async () => {
    await create(); completeForm(); component.addVariant();
    component.variants.at(1).patchValue({ sku: 'RED', color: 'Rojo', price: '120.50' });
    await component.save();
    expect(service.create).toHaveBeenCalledOnceWith(jasmine.objectContaining({
      productCategoryId: 'category', price: 100, variations: [
        jasmine.objectContaining({ sku: 'BLACK', color: 'Negro', price: null }),
        jasmine.objectContaining({ sku: 'RED', color: 'Rojo', price: 120.5 }),
      ],
    }));
    expect(router.navigate).toHaveBeenCalledWith(['/app/products-list']);
  });

  it('loads and updates existing variants with their IDs', async () => {
    await create('product');
    expect(component.form.controls.name.value).toBe('Funda');
    component.variants.at(0).patchValue({ color: 'Azul', isActive: false });
    await component.save();
    expect(service.create).not.toHaveBeenCalled();
    expect(service.update).toHaveBeenCalledWith('product', jasmine.objectContaining({
      variations: [jasmine.objectContaining({ id: 'variant', color: 'Azul', isActive: false })],
    }));
  });

  it('blocks duplicate SKUs and users without manage_products', async () => {
    await create(); completeForm(); component.addVariant();
    component.variants.at(1).patchValue({ sku: 'black', color: 'Rojo' });
    await component.save(); expect(service.create).not.toHaveBeenCalled();
    component.removeVariant(1); canManage = false;
    await component.save(); expect(service.create).not.toHaveBeenCalled();
  });

  it('retries compatibility failures by updating the saved product', async () => {
    await create(); completeForm(); component.selectedModels.set(['model']);
    service.addCompatibilities.and.returnValue(throwError(() => new Error('offline')));
    await component.save();
    expect(component.error()).toContain('sin duplicar');
    service.addCompatibilities.and.returnValue(of({ success: true, timestamp: '', data: { createdCount: 1 } }));
    await component.save();
    expect(service.create).toHaveBeenCalledTimes(1);
    expect(service.update).toHaveBeenCalledWith('product', jasmine.any(Object));
  });

  it('does not save stale form data after changing stores', async () => {
    await create(); completeForm(); store.setSelectedStore('other-store');
    await component.save(); expect(service.create).not.toHaveBeenCalled();
  });
});
