import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { InputComponent } from '../../../shared/components/input/input.component';
import { Component, DestroyRef, ElementRef, HostListener, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { EMPTY, Subject, catchError, finalize, startWith, switchMap, tap } from 'rxjs';
import { AuthService } from '../../../auth/services/auth.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { RoutesService } from '../../../shared/services/routes.service';
import { SelectedStoreService } from '../../../shared/services/selected-store.service';
import { ProductsService } from '../../../products/services/products.service';
import { StoreCurrency } from '../../../products/interfaces/product.interface';
import { formatProductMoney } from '../../../products/utils/product-money';
import { CheckoutProduct, PaymentMethod, Sale, SalesService } from '../../sales.service';

interface CartLine {
  id: string;
  locationId?: string;
  product: CheckoutProduct;
  quantity: number | null;
  serialText: string;
}

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [PaginationComponent, InputComponent, FormsModule, RouterLink, PageHeaderComponent],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.scss',
})
export class CheckoutComponent {
  pageSize = 20;
  changePageSize(size: number) { this.pageSize = size; this.search(1); }
  private readonly service = inject(SalesService);
  private readonly productsService = inject(ProductsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly auth = inject(AuthService);
  readonly store = inject(SelectedStoreService);
  readonly routes = inject(RoutesService).routes.app.sales;
  readonly canView = computed(() => this.auth.hasPermission('view_all_sales') || this.auth.hasPermission('view_own_sales'));
  private readonly searches = new Subject<{ text: string; page: number }>();
  private readonly reloadMethods = new Subject<void>();
  private readonly scanner = viewChild<ElementRef<HTMLInputElement>>('scanner');
  private readonly paymentInput = viewChild<ElementRef<HTMLSelectElement>>('paymentInput');
  private appliedSearch = '';
  searchText = '';
  description = '';
  paymentMethodId = '';
  readonly results = signal<CheckoutProduct[]>([]);
  readonly cart = signal<CartLine[]>([]);
  readonly origins = signal<Record<string, string>>({});
  readonly currency = signal<StoreCurrency | null>(null);
  readonly methods = signal<PaymentMethod[]>([]);
  readonly sale = signal<Sale | null>(null);
  readonly page = signal(1);
  readonly pages = signal(0);
  readonly loading = signal(false);
  readonly methodsLoading = signal(false);
  readonly methodsFailed = signal(false);
  readonly busy = signal(false);
  readonly attempted = signal(false);
  readonly searchError = signal('');
  readonly error = signal('');
  readonly totalCents = computed(() => this.cart().reduce((sum, line) =>
    sum + (line.quantity ?? 0) * Math.round(Number(line.product.price) * 100), 0));
  readonly lineErrors = computed(() => {
    const used = new Set<string>();
    return this.cart().map(line => {
      const serials = line.product.trackSerialNumbers ? this.serials(line) : [];
      const duplicate = serials.some(serial => {
        if (used.has(serial)) return true;
        used.add(serial);
        return false;
      });
      if (line.quantity === null || !Number.isInteger(line.quantity) || line.quantity < 1) {
        return 'Ingresa una cantidad entera mayor a cero.';
      }
      const available = this.available(line);
      if (line.quantity > available) {
        return `La cantidad supera las piezas disponibles o permitidas (${available}).`;
      }
      if (line.product.trackSerialNumbers && (serials.length !== line.quantity || serials.length > 1000)) {
        return 'Captura un número de serie por pieza, con un máximo de 1000.';
      }
      if (duplicate || new Set(serials).size !== serials.length || serials.some(serial => serial.length > 100)) {
        return 'Cada número de serie debe ser único y tener hasta 100 caracteres.';
      }
      return '';
    });
  });

  constructor() {
    const storeChanges = toObservable(this.store.selectedStoreId);
    storeChanges.pipe(
      switchMap(storeId => {
        this.reset();
        this.searchText = this.appliedSearch = '';
        this.origins.set({});
        this.currency.set(null);
        if (!storeId) return EMPTY;
        return this.searches.pipe(startWith({ text: '', page: 1 }), switchMap(({ text, page }) => {
          this.loading.set(true);
          this.searchError.set('');
          this.results.set([]);
          return this.service.products(text, page, this.pageSize).pipe(
            tap(({ data, meta }) => {
              this.results.set(data);
              this.page.set(page);
              this.pages.set(meta?.totalPages ?? 1);
              this.cart.update(lines => lines.map(line => ({
                ...line, product: data.find(product => product.productVariationId === line.product.productVariationId) ?? line.product,
              })));
            }),
            catchError(() => { this.searchError.set('No se pudieron buscar productos. Intenta nuevamente.'); return EMPTY; }),
            finalize(() => this.loading.set(false)),
          );
        }));
      }), takeUntilDestroyed(this.destroyRef),
    ).subscribe();

    storeChanges.pipe(
      switchMap(storeId => {
        this.methods.set([]);
        return storeId ? this.reloadMethods.pipe(startWith(undefined), switchMap(() => {
          this.methodsLoading.set(true);
          this.methodsFailed.set(false);
          return this.service.paymentMethods().pipe(
            tap(methods => this.methods.set(methods)),
            catchError(() => { this.methodsFailed.set(true); return EMPTY; }),
            finalize(() => this.methodsLoading.set(false)),
          );
        })) : EMPTY;
      }), takeUntilDestroyed(this.destroyRef),
    ).subscribe();

    storeChanges.pipe(
      switchMap(storeId => storeId && (this.auth.hasPermission('view_products') || this.auth.hasPermission('manage_products'))
        ? this.productsService.currency().pipe(catchError(() => EMPTY)) : EMPTY),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(({ data }) => this.currency.set(data));
  }

  @HostListener('document:keydown', ['$event'])
  shortcuts(event: KeyboardEvent) {
    if (this.busy() || this.sale()) return;
    const control = event.key === 'F2' ? this.scanner() : event.key === 'F8' ? this.paymentInput() : undefined;
    if (!control) return;
    event.preventDefault();
    control.nativeElement.focus();
  }

  search(page?: number) {
    if (this.busy()) return;
    const text = page === undefined ? this.searchText.trim() : this.appliedSearch;
    if (text.length > 50) { this.searchError.set('La búsqueda admite hasta 50 caracteres.'); return; }
    this.appliedSearch = text;
    this.searches.next({ text, page: page ?? 1 });
  }

  retryMethods() { this.reloadMethods.next(); }

  validMethod() { return this.methods().some(method => method.id === this.paymentMethodId); }

  locations(product: CheckoutProduct) {
    return (product.locations ?? []).filter(location => location.existence > 0);
  }

  chooseOrigin(product: CheckoutProduct, locationId: string) {
    this.origins.update(origins => ({ ...origins, [product.productVariationId]: locationId }));
  }

  origin(product: CheckoutProduct) {
    if (product.trackSerialNumbers) return undefined;
    const locations = this.locations(product);
    return locations.length === 1 ? locations[0] : locations.find(location =>
      location.id === this.origins()[product.productVariationId]);
  }

  available(line: CartLine) {
    return line.locationId
      ? Math.min(line.product.locations?.find(location => location.id === line.locationId)?.existence ?? 0, 1000000)
      : Math.min(line.product.existence, line.product.trackSerialNumbers ? 1000 : 1000000);
  }

  originLabel(line: CartLine) {
    const location = line.product.locations?.find(location => location.id === line.locationId);
    return location ? [location.categoryName, location.code].filter(Boolean).join(' · ') : 'Origen seleccionado';
  }

  add(product: CheckoutProduct) {
    if (this.busy() || product.existence < 1) return;
    const locationId = this.origin(product)?.id;
    if (!product.trackSerialNumbers && !locationId) return;
    const id = locationId ? product.productVariationId + ':' + locationId : product.productVariationId;
    const line = this.cart().find(item => item.id === id);
    if (!line && this.cart().length >= 100) { this.error.set('Puedes vender hasta 100 variantes en una sola venta.'); return; }
    const quantity = (line?.quantity ?? 0) + 1;
    const next = { id, locationId, product, quantity, serialText: line?.serialText ?? '' };
    if (quantity > this.available(next)) {
      this.error.set('Ya agregaste todas las piezas disponibles para este origen.');
      return;
    }
    this.error.set('');
    this.cart.update(lines => line ? lines.map(item => item.id === id ? next : item) : [...lines, next]);
  }

  updateLine(id: string, values: Partial<Pick<CartLine, 'quantity' | 'serialText'>>) {
    if (this.busy()) return;
    this.cart.update(lines => lines.map(line => line.id === id ? { ...line, ...values } : line));
  }

  remove(id: string) {
    if (!this.busy()) this.cart.update(lines => lines.filter(line => line.id !== id));
  }

  reset() {
    this.cart.set([]);
    this.sale.set(null);
    this.error.set('');
    this.attempted.set(false);
    this.paymentMethodId = '';
    this.description = '';
  }

  money(value: number | string) { return formatProductMoney(value, this.currency()); }

  complete() {
    const storeId = this.store.selectedStoreId();
    if (!storeId || this.busy() || this.sale()) return;
    this.attempted.set(true);
    this.error.set('');
    if (!this.cart().length || this.lineErrors().some(Boolean)
      || !this.validMethod() || this.description.trim().length > 500) return;
    const total = this.totalCents();
    if (!Number.isSafeInteger(total) || total < 0 || total > 9999999999) {
      this.error.set('El total supera el importe permitido para una venta.');
      return;
    }
    this.busy.set(true);
    this.service.create({
      paymentMethodId: this.paymentMethodId,
      description: this.description.trim() || undefined,
      items: this.cart().map(line => ({
        productVariationId: line.product.productVariationId,
        quantity: line.quantity!,
        ...(line.locationId ? { locationId: line.locationId } : {}),
        ...(line.product.trackSerialNumbers ? { serialNumbers: this.serials(line) } : {}),
      })),
    }).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.busy.set(false))).subscribe({
      next: ({ data }) => { if (this.store.selectedStoreId() === storeId) this.sale.set(data); },
      error: err => { if (this.store.selectedStoreId() === storeId) this.error.set(err.message || 'No se pudo registrar la venta.'); },
    });
  }

  private serials(line: CartLine): string[] {
    return line.serialText.split(/[,\n]+/).map(serial => serial.trim().toUpperCase()).filter(Boolean);
  }
}
