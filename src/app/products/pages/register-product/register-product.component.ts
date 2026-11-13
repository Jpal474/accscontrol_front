import { Component, DestroyRef, ElementRef, HostListener, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { EMPTY, Subject, catchError, finalize, firstValueFrom, forkJoin, of, startWith, switchMap, tap } from 'rxjs';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { AuthService } from '../../../auth/services/auth.service';
import { SelectedStoreService } from '../../../shared/services/selected-store.service';
import { ToastService } from '../../../shared/services/toast.service';
import { ProductsService } from '../../services/products.service';
import { Product, ProductLookup, ProductVariation, SaveProduct } from '../../interfaces/product.interface';
import { productImageUrl } from '../../utils/product-image';
import { StoreCurrency } from '../../interfaces/product.interface';
import { formatProductMoney, productCurrencySymbol } from '../../utils/product-money';

interface EditorModel { id: string; name: string; brandName: string; active: boolean; }
const money = /^\d{1,8}(\.\d{1,2})?$/;
@Component({
  selector: 'app-register-product', standalone: true,
  imports: [ReactiveFormsModule, RouterLink, PageHeaderComponent, SkeletonComponent],
  templateUrl: './register-product.component.html', styleUrl: './register-product.component.scss',
})
export class RegisterProductComponent {
  private readonly fb = inject(FormBuilder);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(ProductsService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  readonly store = inject(SelectedStoreService);
  readonly id = this.route.snapshot.paramMap.get('id');
  private savedId: string | null = this.id;
  private loadedStoreId: string | null = null;
  private originalModels: string[] = [];
  private disposed = false;
  private readonly refresh = new Subject<void>();
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly failed = signal(false);
  readonly error = signal('');
  readonly currency = signal<StoreCurrency | null>(null);
  readonly currencySymbol = computed(() => productCurrencySymbol(this.currency()));
  money(value: number | string) { return formatProductMoney(value, this.currency()); }
  readonly imagePreview = signal<string | null>(null);
  readonly imageError = signal('');
  readonly imageFailed = signal(false);
  readonly imageName = signal('');
  private imageFile?: File;
  private imageObjectUrl: string | null = null;
  private existingImage: string | null = null;
  readonly lookups = signal<{ categories: ProductLookup[]; brands: ProductLookup[]; deviceModels: EditorModel[] }>({
    categories: [], brands: [], deviceModels: [],
  });
  readonly selectedModels = signal<string[]>([]);
  readonly modelSearch = signal('');
  readonly modelsOpen = signal(false);
  readonly activeModelIndex = signal(0);
  searchModels(value: string) {
    this.modelSearch.set(value);
    this.activeModelIndex.set(0);
    this.modelsOpen.set(true);
  }

  selectModel(id: string) {
    if (this.availableModels().some((model: { id: string }) => model.id === id))
      this.selectedModels.update((ids) => [...ids, id]);
    this.activeModelIndex.set(0);
  }

  modelKeydown(event: KeyboardEvent) {
    const count = Math.min(30, this.availableModels().length);
    if (event.key === 'Escape' || event.key === 'Tab') {
      this.modelsOpen.set(false);
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!this.modelsOpen()) {
        this.modelsOpen.set(true);
        this.activeModelIndex.set(0);
      } else if (count) {
        this.activeModelIndex.update(
          (index) =>
            (index + (event.key === 'ArrowDown' ? 1 : -1) + count) % count,
        );
      }
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (!this.modelsOpen()) this.modelsOpen.set(true);
      else {
        const model = this.availableModels()[this.activeModelIndex()];
        if (model) this.selectModel(model.id);
      }
    }
  }

  @HostListener('document:click', ['$event'])
  closeModelsOutside(event: MouseEvent) {
    const picker =
      this.element.nativeElement.querySelector('.model-multiselect');
    if (picker && !picker.contains(event.target as Node))
      this.modelsOpen.set(false);
  }

  readonly availableModels = computed(() => {
    const normalize = (value: string) =>
      value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
    const terms = normalize(this.modelSearch())
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    const selected = new Set(this.selectedModels());
    return (this.lookups()?.deviceModels || []).filter((model: EditorModel) => {
      const label = normalize(`${model.brandName || ''} ${model.name}`);
      return (
        model.active &&
        !selected.has(model.id) &&
        terms.every((term) => label.includes(term))
      );
    });
  });

  readonly selectedModelRecords = computed(() => {
    const selected = new Set(this.selectedModels());
    return (this.lookups()?.deviceModels || []).filter((model: EditorModel) =>
      selected.has(model.id),
    );
  });

  removeModel(id: string) {
    this.selectedModels.update((ids) => ids.filter((value) => value !== id));
  }

  private variant(value?: ProductVariation) {
    return this.fb.nonNullable.group({
      id: value?.id || '',
      sku: [value?.sku || '', [Validators.required, Validators.maxLength(100), Validators.pattern(/\S/)]],
      color: [value?.color || '', [Validators.required, Validators.pattern(/\S/)]],
      size: value?.size || '', material: value?.material || '',
      capacity: value?.capacity || '', ram: value?.ram || '',
      price: [value?.price == null ? '' : String(value.price), Validators.pattern(money)],
      isActive: value?.isActive ?? true,
    });
  }

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100), Validators.pattern(/\S/)]],
    description: ['', Validators.maxLength(4000)],
    price: ['', [Validators.required, Validators.pattern(money)]],
    categoryId: ['', Validators.required], brandId: ['', Validators.required],
    isActive: true,
    variants: this.fb.array([this.variant()], [Validators.required, Validators.minLength(1)]),
  });
  get variants() { return this.form.controls.variants; }

  constructor() {
    this.destroyRef.onDestroy(() => { this.disposed = true; this.revokeImagePreview(); });
    toObservable(this.store.selectedStoreId).pipe(
      tap(() => {
        this.loadedStoreId = null; this.savedId = this.id; this.error.set('');
        this.currency.set(null);
        this.existingImage = null; this.clearSelectedImage();
        this.form.reset({ name: '', description: '', price: '', categoryId: '', brandId: '', isActive: true });
        this.variants.clear(); this.variants.push(this.variant());
        this.selectedModels.set([]); this.originalModels = [];
      }),
      switchMap(storeId => this.refresh.pipe(startWith(undefined), switchMap(() => {
        this.failed.set(false);
        if (!storeId) { this.loading.set(false); return EMPTY; }
        this.loading.set(true);
        return forkJoin({
          lookups: this.service.lookups(),
          currency: this.service.currency(),
          product: this.savedId ? this.service.get(this.savedId) : of(null),
        }).pipe(
          tap(({ lookups, product, currency }) => {
            this.currency.set(currency.data);
            this.lookups.set({ categories: lookups.categories, brands: lookups.brands,
              deviceModels: lookups.models.map(model => ({ id: model.id, name: model.model, brandName: '', active: model.isActive })) });
            this.loadedStoreId = storeId;
            if (product) this.fillProduct(product.data);
          }),
          catchError(() => { this.failed.set(true); return EMPTY; }),
          finalize(() => this.loading.set(false)),
        );
      }))), takeUntilDestroyed(this.destroyRef),
    ).subscribe();
  }

  load() { this.refresh.next(); }

  private fillProduct(product: Product) {
    this.existingImage = productImageUrl(product.image);
    this.clearSelectedImage();
    this.form.patchValue({ name: product.name, description: product.description, price: String(product.price),
      categoryId: product.categoryId, brandId: product.brandId, isActive: product.isActive });
    this.fillVariants(product);
    this.originalModels = (product.compatibleModels || []).map(item => item.deviceModelId || item.deviceModel.id);
    this.selectedModels.set([...this.originalModels]);
    const target = this.route.snapshot.queryParamMap.get('variation');
    if (target) setTimeout(() => {
      if (!this.disposed) this.element.nativeElement.querySelector<HTMLElement>(`[data-variation-id="${target.replace(/[^a-zA-Z0-9-]/g, '')}"]`)
        ?.scrollIntoView({ block: 'center' });
    });
  }

  private fillVariants(product: Product) {
    this.variants.clear();
    for (const variation of product.variations || []) this.variants.push(this.variant(variation));
    if (!this.variants.length) this.variants.push(this.variant());
  }

  addVariant() {
    if (!this.busy() && this.variants.length < 100) this.variants.push(this.variant());
  }

  selectImage(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || this.busy()) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024 || !file.size) {
      this.imageError.set('Selecciona una imagen JPG, PNG o WebP de hasta 5 MB.');
      return;
    }
    this.revokeImagePreview();
    this.imageFile = file;
    this.imageObjectUrl = URL.createObjectURL(file);
    this.imagePreview.set(this.imageObjectUrl);
    this.imageName.set(file.name); this.imageError.set(''); this.imageFailed.set(false);
  }

  clearSelectedImage() {
    this.revokeImagePreview(); this.imageFile = undefined;
    this.imagePreview.set(this.existingImage);
    this.imageName.set(''); this.imageError.set(''); this.imageFailed.set(false);
  }

  private revokeImagePreview() {
    if (this.imageObjectUrl) URL.revokeObjectURL(this.imageObjectUrl);
    this.imageObjectUrl = null;
  }

  removeVariant(index: number) {
    if (!this.busy() && this.variants.length > 1 && !this.variants.at(index).controls.id.value) this.variants.removeAt(index);
  }

  private assertStore(storeId: string) {
    if (this.disposed || this.store.selectedStoreId() !== storeId) throw new Error('La tienda activa cambió. Revisa los datos antes de guardar.');
  }

  async save() {
    if (this.busy() || !this.auth.hasPermission('manage_products')) return;
    const storeId = this.loadedStoreId;
    if (!storeId || storeId !== this.store.selectedStoreId()) return;
    this.form.markAllAsTouched(); this.error.set('');
    if (this.form.invalid || !this.variants.length) {
      this.error.set('Completa nombre (máximo 100 caracteres), marca, categoría, precio base y al menos una variante con SKU y color. Usa precios sin comas, con hasta dos decimales.');
      return;
    }
    const values = this.form.getRawValue();
    const skus = values.variants.map(variant => variant.sku.trim().toLowerCase());
    if (new Set(skus).size !== skus.length) { this.error.set('Cada variante debe tener un SKU distinto dentro del producto.'); return; }
    const payload: SaveProduct = {
      name: values.name.trim(), description: values.description.trim(), price: Number(values.price),
      brandId: values.brandId, productCategoryId: values.categoryId, isActive: values.isActive,
      variations: values.variants.map(variant => ({
        ...(variant.id ? { id: variant.id } : {}), sku: variant.sku.trim(), color: variant.color.trim(),
        size: variant.size.trim(), material: variant.material.trim(), capacity: variant.capacity.trim(), ram: variant.ram.trim(),
        price: variant.price === '' ? null : Number(variant.price), isActive: variant.isActive,
      })),
    };
    const selected = [...this.selectedModels()];
    this.busy.set(true);
    let productSaved = false;
    try {
      const request = this.savedId
        ? (this.imageFile ? this.service.update(this.savedId, payload, this.imageFile) : this.service.update(this.savedId, payload))
        : (this.imageFile ? this.service.create(payload, this.imageFile) : this.service.create(payload));
      const response = await firstValueFrom(request);
      this.assertStore(storeId);
      productSaved = true; this.savedId = response.data.id;
      this.existingImage = productImageUrl(response.data.image); this.clearSelectedImage();
      this.fillVariants(response.data);
      const added = selected.filter(id => !this.originalModels.includes(id));
      const removed = this.originalModels.filter(id => !selected.includes(id));
      if (added.length) {
        this.assertStore(storeId);
        await firstValueFrom(this.service.addCompatibilities(this.savedId, added));
        this.assertStore(storeId); this.originalModels = [...this.originalModels, ...added];
      }
      if (removed.length) {
        this.assertStore(storeId);
        await firstValueFrom(this.service.removeCompatibilities(this.savedId, removed));
        this.assertStore(storeId); this.originalModels = this.originalModels.filter(id => !removed.includes(id));
      }
      this.assertStore(storeId);
      this.toast.show('Producto y variantes guardados.', 'success');
      await this.router.navigate([this.auth.hasPermission('view_products') ? '/app/products-list' : '/app']);
    } catch (error: unknown) {
      if (this.disposed || storeId !== this.store.selectedStoreId()) return;
      const response = error as { error?: { message?: string | string[] }; message?: string };
      const message = response.error?.message;
      const detail = Array.isArray(message) ? message.join(' ') : message || 'Revisa los datos e inténtalo de nuevo.';
      this.error.set(productSaved ? `El producto y sus variantes se guardaron, pero faltan compatibilidades. Puedes reintentar sin duplicar el producto. ${detail}` : `No se pudo guardar. ${detail}`);
    } finally { if (!this.disposed) this.busy.set(false); }
  }
}
