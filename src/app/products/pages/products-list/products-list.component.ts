import { Component, DestroyRef, computed, inject, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ElementRef } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { EMPTY, Observable, Subject, catchError, finalize, forkJoin, startWith, switchMap, tap, takeUntil } from 'rxjs';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { AuthService } from '../../../auth/services/auth.service';
import { SelectedStoreService } from '../../../shared/services/selected-store.service';
import { ToastService } from '../../../shared/services/toast.service';
import { ProductsService } from '../../services/products.service';
import { Product, ProductLookups } from '../../interfaces/product.interface';
import { productImageUrl } from '../../utils/product-image';
import { StoreCurrency } from '../../interfaces/product.interface';
import { formatProductMoney } from '../../utils/product-money';

interface ProductRow {
  id: string;
  productId: string;
  variationId: string;
  name: string;
  sku: string;
  price: string;
  models: string;
  status: string;
  isActive: boolean;
  disableAction: boolean;
  editDisabled: boolean;
  previewHidden: boolean;
}

@Component({
  selector: 'app-products-list', standalone: true,
  imports: [ReactiveFormsModule, RouterLink, PageHeaderComponent, DataTableComponent,
    EmptyStateComponent, SkeletonComponent, ConfirmDialogComponent],
  templateUrl: './products-list.component.html', styleUrl: './products-list.component.scss',
})
export class ProductsListComponent {
  readonly auth = inject(AuthService);
  readonly store = inject(SelectedStoreService);
  private readonly service = inject(ProductsService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly refresh = new Subject<void>();
  private readonly storeChanged = new Subject<void>();
  readonly currency = signal<StoreCurrency | null>(null);
  readonly lookupLoading = signal({ brands: false, categories: false });
  private loadedLookups = new Set<'brands' | 'categories'>();
  readonly confirmation = viewChild.required(ConfirmDialogComponent);
  readonly imageModal = viewChild<ElementRef<HTMLDialogElement>>('imageModal');
  readonly preview = signal<{ name: string; image: string | null } | null>(null);
  readonly imageFailed = signal(false);
  readonly products = signal<Product[]>([]);
  readonly lookups = signal<ProductLookups>({ categories: [], brands: [], models: [] });
  readonly loading = signal(false);
  readonly failed = signal(false);
  readonly busy = signal(false);
  readonly total = signal(0);
  readonly totalPages = signal(0);
  readonly pending = signal<{ row: ProductRow; storeId: string } | null>(null);
  page = 1;
  readonly pageSize = 10;
  readonly filters = inject(FormBuilder).nonNullable.group({ search: '', brandId: '', categoryId: '', status: 'active' });
  readonly columns = [
    { key: 'name', label: 'Producto / variante', action: 'preview' }, { key: 'sku', label: 'SKU' },
    { key: 'price', label: 'Precio' }, { key: 'models', label: 'Compatibilidad' }, { key: 'status', label: 'Estado' },
  ];
  readonly actions = computed(() => [
    { key: 'detail', label: 'Ver detalles' },
    ...(this.auth.hasPermission('manage_products') ? [{ key: 'edit', label: 'Editar' }, { key: 'toggle', label: 'Cambiar Estado' }] : []),
  ]);
  readonly rows = computed<ProductRow[]>(() => this.products().flatMap(product => {
    const common = {
      productId: product.id,
      models: product.compatibleModels?.map(item => item.deviceModel.model).join(', ') || 'Sin compatibilidades',
      disableAction: this.busy(), editDisabled: this.busy(),
    };
    return [{ ...common, id: product.id, variationId: '', name: product.name, sku: '—', previewHidden: false,
      price: this.money(product.price), status: product.isActive ? 'Activo' : 'Inactivo', isActive: product.isActive },
      ...(product.variations || []).map(variation => ({
        ...common, id: variation.id, variationId: variation.id, previewHidden: true,
        name: `↳ ${[variation.color, variation.size, variation.material, variation.capacity, variation.ram].filter(Boolean).join(' · ')}`,
        sku: variation.sku, price: this.money(variation.price ?? product.price),
        status: variation.isActive ? (product.isActive ? 'Activa' : 'Activa · producto inactivo') : 'Inactiva',
        isActive: variation.isActive,
      }))];
  }));

  constructor() {
    toObservable(this.store.selectedStoreId).pipe(
      tap(() => {
        this.storeChanged.next(); this.loadedLookups.clear(); this.currency.set(null);
        this.lookupLoading.set({ brands: false, categories: false });
        this.closeImage();
        this.page = 1; this.products.set([]); this.pending.set(null);
        this.filters.reset({ search: '', brandId: '', categoryId: '', status: 'active' }, { emitEvent: false });
        this.lookups.set({ categories: [], brands: [], models: [] });
      }),
      switchMap(storeId => this.refresh.pipe(startWith(undefined), switchMap(() => {
        this.failed.set(false); this.total.set(0); this.totalPages.set(0);
        if (!storeId) { this.loading.set(false); return EMPTY; }
        this.loading.set(true);
        const values = this.filters.getRawValue();
        return forkJoin({
          products: this.service.list({ page: this.page, pageSize: this.pageSize, search: values.search.trim(),
            categoryId: values.categoryId, brandId: values.brandId,
            isActive: values.status === 'all' ? undefined : values.status === 'active' }),
          currency: this.service.currency(),
        }).pipe(
          tap(({ products, currency }) => {
            this.products.set(products.data); this.currency.set(currency.data);
            this.total.set(products.meta?.total ?? 0); this.totalPages.set(products.meta?.totalPages ?? 0);
          }),
          catchError(() => { this.products.set([]); this.failed.set(true); return EMPTY; }),
          finalize(() => this.loading.set(false)),
        );
      }))), takeUntilDestroyed(this.destroyRef),
    ).subscribe();
  }

  private money(value: number | string) {
    return formatProductMoney(value, this.currency());
  }

  loadLookup(kind: 'brands' | 'categories') {
    if (!this.store.selectedStoreId() || this.loadedLookups.has(kind) || this.lookupLoading()[kind]) return;
    this.lookupLoading.update(value => ({ ...value, [kind]: true }));
    const request = kind === 'brands' ? this.service.brands() : this.service.categories();
    request.pipe(takeUntil(this.storeChanged), takeUntilDestroyed(this.destroyRef),
      finalize(() => this.lookupLoading.update(value => ({ ...value, [kind]: false }))),
    ).subscribe({
      next: items => { this.loadedLookups.add(kind); this.lookups.update(value => ({ ...value, [kind]: items })); },
      error: () => this.toast.show('No se pudieron cargar las opciones. Vuelve a abrir el selector.', 'error'),
    });
  }

  load(page = 1) { this.page = page; this.refresh.next(); }

  handleAction(event: { action: string; row: Record<string, string | number> }) {
    if (event.action === 'detail') {
      const row = this.rows().find(item => item.id === event.row['id']);
      if (row && this.store.selectedStoreId()) void this.router.navigate(['/app/product-detail', row.productId]);
      return;
    }
    if (event.action === 'preview') {
      const product = this.products().find(item => item.id === event.row['id']);
      if (!product || !this.store.selectedStoreId()) return;
      this.preview.set({ name: product.name, image: productImageUrl(product.image) });
      this.imageFailed.set(false);
      this.imageModal()?.nativeElement.showModal();
      return;
    }
    if (this.busy() || !this.auth.hasPermission('manage_products')) return;
    const row = this.rows().find(item => item.id === event.row['id']);
    const storeId = this.store.selectedStoreId();
    if (!row || !storeId) return;
    if (event.action === 'edit') {
      void this.router.navigate(['/app/edit-product', row.productId], { queryParams: row.variationId ? { variation: row.variationId } : {} });
    } else if (event.action === 'toggle') {
      this.pending.set({ row, storeId }); this.confirmation().open();
    }
  }

  closeImage() {
    this.imageModal()?.nativeElement.close(); this.preview.set(null);
  }

  closeImageOnBackdrop(event: MouseEvent) {
    if (event.target === event.currentTarget) this.closeImage();
  }

  toggle() {
    const pending = this.pending();
    if (!pending || pending.storeId !== this.store.selectedStoreId() || this.busy() || !this.auth.hasPermission('manage_products')) return;
    this.busy.set(true);
    const request: Observable<unknown> = pending.row.variationId ? this.service.toggleVariation(pending.row.variationId)
      : this.service.update(pending.row.productId, { isActive: !pending.row.isActive });
    request.pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.busy.set(false))).subscribe({
      next: () => {
        if (pending.storeId !== this.store.selectedStoreId()) return;
        this.pending.set(null); this.toast.show('Estado actualizado.', 'success'); this.load(this.page);
      }, error: () => this.toast.show('No se pudo actualizar el estado.', 'error'),
    });
  }
}
