import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { EMPTY, Subject, catchError, combineLatest, finalize, forkJoin, startWith, switchMap, tap } from 'rxjs';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { AuthService } from '../../../auth/services/auth.service';
import { SelectedStoreService } from '../../../shared/services/selected-store.service';
import { ProductsService } from '../../services/products.service';
import { Product, ProductVariation, StoreCurrency } from '../../interfaces/product.interface';
import { productImageUrl } from '../../utils/product-image';
import { formatProductMoney } from '../../utils/product-money';

@Component({
  selector: 'app-product-detail', standalone: true,
  imports: [RouterLink, SkeletonComponent, EmptyStateComponent],
  templateUrl: './product-detail.component.html', styleUrl: './product-detail.component.scss',
})
export class ProductDetailComponent {
  readonly auth = inject(AuthService);
  readonly store = inject(SelectedStoreService);
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(ProductsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly refresh = new Subject<void>();
  readonly product = signal<Product | null>(null);
  readonly currency = signal<StoreCurrency | null>(null);
  readonly loading = signal(false);
  readonly failed = signal(false);
  readonly imageError = signal(false);
  readonly image = computed(() => productImageUrl(this.product()?.image));
  readonly selectedVariantId = signal<string | null>(null);
  readonly activeTab = signal<'details' | 'variants' | 'compatibility'>('details');
  readonly selectedVariant = computed(() => this.product()?.variations.find(variant => variant.id === this.selectedVariantId()) ?? null);
  readonly displayPrice = computed(() => this.selectedVariant()?.price ?? this.product()?.price ?? 0);
  readonly activeVariantCount = computed(() => this.product()?.variations.filter(variant => variant.isActive).length ?? 0);
  readonly characteristics = computed(() => {
    const product = this.product();
    const variant = this.selectedVariant();
    return [
      { label: 'SKU', value: variant?.sku },
      { label: 'Marca', value: product?.brand?.name },
      { label: 'Categoría', value: product?.category?.name },
      { label: 'Modelo', value: product?.deviceModel?.model },
      { label: 'Color', value: variant?.color },
      { label: 'Talla / tamaño', value: variant?.size },
      { label: 'Material', value: variant?.material },
      { label: 'Capacidad', value: variant?.capacity },
      { label: 'RAM', value: variant?.ram },
    ].filter(item => !!item.value);
  });

  constructor() {
    combineLatest([this.route.paramMap, toObservable(this.store.selectedStoreId)]).pipe(
      switchMap(([params, storeId]) => this.refresh.pipe(startWith(undefined), switchMap(() => {
        this.product.set(null); this.currency.set(null); this.imageError.set(false); this.failed.set(false);
        this.selectedVariantId.set(null); this.activeTab.set('details');
        const id = params.get('id');
        if (!storeId || !id) { this.loading.set(false); this.failed.set(!!storeId && !id); return EMPTY; }
        this.loading.set(true);
        return forkJoin({ product: this.service.get(id), currency: this.service.currency() }).pipe(
          tap(({ product, currency }) => {
            this.product.set(product.data); this.currency.set(currency.data);
            this.selectedVariantId.set((product.data.variations.find(variant => variant.isActive) ?? product.data.variations[0])?.id ?? null);
          }),
          catchError(() => { this.failed.set(true); return EMPTY; }),
          finalize(() => this.loading.set(false)),
        );
      }))), takeUntilDestroyed(this.destroyRef),
    ).subscribe();
  }
  load() { this.refresh.next(); }
  money(value: number | string) { return formatProductMoney(value, this.currency()); }
  variantLabel(variant: ProductVariation) {
    return [variant.color, variant.size, variant.capacity, variant.ram].filter(Boolean).join(' · ') || variant.sku;
  }
  selectVariant(id: string) {
    if (this.product()?.variations.some(variant => variant.id === id)) this.selectedVariantId.set(id);
  }
  tabKeydown(event: KeyboardEvent) {
    const tabs = ['details', 'variants', 'compatibility'] as const;
    const index = tabs.indexOf(this.activeTab());
    const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length
      : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length
      : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1;
    if (next < 0) return;
    event.preventDefault(); this.activeTab.set(tabs[next]);
    (event.currentTarget as HTMLElement).querySelector<HTMLButtonElement>(`#tab-${tabs[next]}`)?.focus();
  }
}
