import { DatePipe } from '@angular/common';
import { Component, DestroyRef, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { EMPTY, Observable, Subject, catchError, combineLatest, finalize, map, startWith, switchMap, takeUntil, tap } from 'rxjs';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { InventoryLocation, StockLocation } from '../../interfaces/inventory.interface';
import { AuthService } from '../../../auth/services/auth.service';
import { SelectedStoreService } from '../../../shared/services/selected-store.service';
import { ToastService } from '../../../shared/services/toast.service';
import { InventoryService } from '../../services/inventory.service';
import { InventorySaleSelectorComponent } from '../../components/inventory-sale-selector/inventory-sale-selector.component';
import { InventoryMovementRequest, InventoryUnit, InventoryVariant, MovementReason, MovementType, MOVEMENT_REASON_LABELS, MOVEMENT_TYPE_LABELS, StockBalance, StockMovement, TransferTarget } from '../../interfaces/inventory.interface';

type View = 'balances' | 'movements';
type Operation = MovementType | 'TRANSFER';
const integer = (value: unknown) => Number.isSafeInteger(Number(value)) && Number(value) > 0;
@Component({
  selector: 'app-inventory', standalone: true,
  imports: [ReactiveFormsModule, FormsModule, DatePipe, PageHeaderComponent, SkeletonComponent, InventorySaleSelectorComponent],
  templateUrl: './inventory.component.html', styleUrl: './inventory.component.scss',
})
export class InventoryComponent {
  readonly auth = inject(AuthService);
  readonly store = inject(SelectedStoreService);
  private readonly service = inject(InventoryService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly reload = new Subject<void>();
  private readonly storeChanged = new Subject<void>();
  private readonly unitReload = new Subject<void>();
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private variantsLoaded = false;
  private targetsLoaded = false;
  private readonly targetChanged = new Subject<void>();
  private readonly locationReset = new Subject<void>();
  private readonly locationCache = signal<Partial<Record<string, { options: InventoryLocation[]; loading: boolean; failed: boolean }>>>({});
  readonly targetLocations = () => this.options(0, true);
  readonly variantsLoading = signal(false);
  readonly variantsFailed = signal(false);
  readonly targetsLoading = signal(false);
  readonly targetsFailed = signal(false);
  readonly targetsRequested = signal(false);
  readonly highlightedItem = signal<number | null>(null);
  readonly view = signal<View>('balances');
  readonly tabs: { id: View; label: string }[] = [{ id: 'balances', label: 'Existencias' }, { id: 'movements', label: 'Movimientos' }];
  readonly typeLabels = MOVEMENT_TYPE_LABELS;
  readonly operationLabels: Record<Operation, string> = { IN: 'Entrada', OUT: 'Salida', TRANSFER: 'Traslado entre tiendas' };
  readonly reasonLabels: Record<MovementReason | '', string> = { ...MOVEMENT_REASON_LABELS, '': 'Selecciona un motivo' };
  readonly types = Object.values(MovementType);
  readonly reasons = Object.values(MovementReason);
  readonly balances = signal<StockBalance[]>([]);
  readonly movements = signal<StockMovement[]>([]);
  readonly variants = signal<InventoryVariant[]>([]);
  readonly targets = signal<TransferTarget[]>([]);
  readonly loading = signal(false); readonly busy = signal(false); readonly error = signal('');
  readonly lookupLoading = computed(() => this.variantsLoading() || this.activeLocationState('loading') || (this.draft().action === 'TRANSFER' && (this.targetsLoading() || this.activeLocationState('loading', true))));
  readonly lookupFailed = computed(() => this.variantsFailed() || this.activeLocationState('failed') || (this.draft().action === 'TRANSFER' && (this.targetsFailed() || this.activeLocationState('failed', true))));
  readonly page = signal(1); readonly total = signal(0); readonly totalPages = signal(0);
  readonly units = signal<InventoryUnit[]>([]); readonly unitsLoading = signal(false); readonly unitsError = signal('');
  readonly unitsTotalPages = signal(0); unitPage = 1;
  readonly unitVariant = signal<StockBalance | null>(null);
  readonly unitDialog = viewChild<ElementRef<HTMLDialogElement>>('unitDialog');
  search = ''; variantFilter = ''; typeFilter: MovementType | '' = ''; reasonFilter: MovementReason | '' = '';
  readonly operation = this.fb.nonNullable.group({
    action: this.fb.nonNullable.control<Operation>(MovementType.IN), reason: this.fb.nonNullable.control<MovementReason | ''>(MovementReason.PURCHASE, Validators.required),
    targetStoreId: '', saleId: '', notes: ['', Validators.maxLength(2000)],
    items: this.fb.array([this.item()]),
  });
  readonly draft = toSignal(this.operation.valueChanges.pipe(map(() => this.operation.getRawValue())), { initialValue: this.operation.getRawValue() });
  readonly summary = computed(() => {
    const draft = this.draft();
    const serialCounts = new Map<string, number>();
    for (const item of draft.items) for (const serial of this.serials(item.serialText)) serialCounts.set(serial, (serialCounts.get(serial) ?? 0) + 1);
    return draft.items.map((item, index) => {
      const variant = this.variant(item.variantId), serials = this.serials(item.serialText);
      const needsSeries = !!variant?.trackSerialNumbers;
      const validQuantity = integer(item.quantity) && Number(item.quantity) <= 2147483647;
      const location = this.options(index).find(value => value.id === item.locationId);
      const targetLocation = this.options(index, true).find(value => value.id === item.targetLocationId);
      const requestedQuantity = draft.items.filter(row => row.variantId === item.variantId && row.locationId === item.locationId)
        .reduce((total, row) => total + Number(row.quantity), 0);
      const validLocations = !!location && (draft.action === MovementType.IN || requestedQuantity <= location.existence)
        && (draft.action !== 'TRANSFER' || !!targetLocation);
      const validSeries = !needsSeries || (serials.length === Number(item.quantity) && serials.length <= 1000 && serials.every(serial => serial.length <= 100 && serialCounts.get(serial) === 1));
      return { index, name: variant?.productName || 'Selecciona una variante', sku: variant?.sku || '',
        location: location ? this.physicalLocationLabel(location) : 'Selecciona ubicación',
        targetLocation: targetLocation ? this.physicalLocationLabel(targetLocation) : '',
        quantity: validQuantity && !!variant ? Number(item.quantity) : 0, series: serials.length, needsSeries,
        ready: !!variant && validQuantity && validSeries && validLocations && (draft.action !== MovementType.IN || variant.isActive),
      };
    });
  });
  readonly totalUnits = computed(() => this.summary().reduce((sum, row) => sum + row.quantity, 0));
  readonly pendingItems = computed(() => this.summary().filter(row => !row.ready).length);
  readonly destinationName = computed(() => this.targets().find(target => target.id === this.draft().targetStoreId)?.name || 'Selecciona destino');
  get items() { return this.operation.controls.items; }
  private item() { const row = this.fb.nonNullable.group({ variantId: ['', Validators.required], locationId: ['', Validators.required], targetLocationId: '',
    quantity: [1, [Validators.required, Validators.min(1), Validators.max(2147483647), Validators.pattern(/^\d+$/)]], serialText: ['', Validators.maxLength(101000)] });
    row.controls.variantId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      row.patchValue({ locationId: '', targetLocationId: '', serialText: '' }, { emitEvent: false });
    });
    return row;
  }
  constructor() {
    toObservable(this.store.selectedStoreId).pipe(
      tap(() => {
        this.storeChanged.next(); this.page.set(1); this.balances.set([]); this.movements.set([]);
        this.variants.set([]); this.targets.set([]); this.error.set(''); this.closeUnits();
        this.variantsLoaded = false; this.targetsLoaded = false;
        this.variantsLoading.set(false); this.targetsLoading.set(false);
        this.variantsFailed.set(false); this.targetsFailed.set(false); this.highlightedItem.set(null);
        this.targetsRequested.set(false);
        this.search = ''; this.variantFilter = ''; this.typeFilter = ''; this.reasonFilter = '';
        this.locationReset.next(); this.locationCache.set({});
        this.clearTargetLocations();
        this.resetOperation();
      }), takeUntilDestroyed(this.destroyRef),
    ).subscribe();
    combineLatest([toObservable(this.store.selectedStoreId), toObservable(this.view)]).pipe(
      tap(() => this.page.set(1)),
      switchMap(([storeId, view]) => this.reload.pipe(startWith(undefined), switchMap(() => {
        this.error.set(''); this.balances.set([]); this.movements.set([]); this.total.set(0); this.totalPages.set(0);
        if (!storeId) { this.loading.set(false); return EMPTY; }
        this.loading.set(true);
        const query = { page: this.page(), pageSize: 10, search: this.search.trim(), productVariationId: this.variantFilter,
          type: this.typeFilter || undefined, reason: this.reasonFilter || undefined };
        const request: Observable<unknown> = view === 'balances'
          ? this.service.stock(query).pipe(tap(response => { this.balances.set(response.data); this.meta(response.meta); }))
          : this.service.movements(query).pipe(tap(response => { this.movements.set(response.data); this.meta(response.meta); }));
        return request.pipe(catchError(() => { this.error.set('No se pudo cargar el inventario. Vuelve a intentarlo.'); return EMPTY; }), finalize(() => this.loading.set(false)));
      }))), takeUntilDestroyed(this.destroyRef),
    ).subscribe();
    this.unitReload.pipe(switchMap(() => {
      const variant = this.unitVariant();
      if (!variant) return EMPTY;
      this.unitsLoading.set(true); this.unitsError.set(''); this.units.set([]);
      return this.service.units({ productVariationId: variant.productVariationId, page: this.unitPage, pageSize: 50 }).pipe(
        takeUntil(this.storeChanged), tap(response => { this.units.set(response.data); this.unitsTotalPages.set(response.meta?.totalPages ?? 0); }),
        catchError(() => { this.unitsError.set('No se pudieron cargar las series.'); return EMPTY; }), finalize(() => this.unitsLoading.set(false)),
      );
    }), takeUntilDestroyed(this.destroyRef)).subscribe();
    this.operation.controls.targetStoreId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.clearTargetLocations());
    this.operation.controls.reason.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.operation.controls.saleId.setValue(''));
    this.operation.controls.action.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(action => {
      this.items.controls.forEach(item => item.controls.locationId.setValue('', { emitEvent: false }));
      if (action !== 'TRANSFER') this.items.controls.forEach(item => item.controls.targetLocationId.setValue('', { emitEvent: false }));
      this.operation.controls.reason.setValue(action === 'TRANSFER' ? MovementReason.TRANSFER : action === MovementType.IN ? MovementReason.PURCHASE : '');
    });
  }
  private meta(meta?: { total: number; totalPages: number }) { this.total.set(meta?.total ?? 0); this.totalPages.set(meta?.totalPages ?? 0); }
  load() { this.reload.next(); }
  loadVariants() {
    if (!this.store.selectedStoreId() || this.variantsLoaded || this.variantsLoading()) return;
    this.variantsLoading.set(true); this.variantsFailed.set(false);
    this.service.variants().pipe(takeUntil(this.storeChanged), takeUntilDestroyed(this.destroyRef),
      finalize(() => this.variantsLoading.set(false)),
    ).subscribe({ next: variants => { this.variants.set(variants); this.variantsLoaded = true; }, error: () => this.variantsFailed.set(true) });
  }
  loadTargets() {
    if (!this.store.selectedStoreId() || !this.auth.hasPermission('manage_inventory') || this.targetsLoaded || this.targetsLoading()) return;
    this.targetsLoading.set(true); this.targetsFailed.set(false);
    this.targetsRequested.set(true);
    this.service.transferTargets().pipe(takeUntil(this.storeChanged), takeUntilDestroyed(this.destroyRef),
      finalize(() => this.targetsLoading.set(false)),
    ).subscribe({ next: targets => { this.targets.set(targets); this.targetsLoaded = true; }, error: () => this.targetsFailed.set(true) });
  }
  physicalLocationLabel(location: InventoryLocation) {
    return [location.locationCategory?.name, [location.code, location.description].filter(Boolean).join(' / ')].filter(Boolean).join(' - ');
  }
  private locationKey(index: number, target = false) {
    this.draft();
    const variant = this.items.at(index)?.controls.variantId.value;
    return variant ? target ? `target:${this.operation.controls.targetStoreId.value}:${variant}` : `source:${this.operation.controls.action.value === 'IN' ? 'all' : 'stock'}:${variant}` : '';
  }
  private activeLocationState(field: 'loading' | 'failed', target = false) {
    return this.draft().items.some((_, index) => this.locationState(index, target)?.[field]);
  }
  locationState(index: number, target = false) { return this.locationCache()[this.locationKey(index, target)]; }
  options(index: number, target = false) { return this.locationState(index, target)?.options ?? []; }
  private clearTargetLocations() {
    this.targetChanged.next();
    this.locationCache.update(cache => Object.fromEntries(Object.entries(cache).filter(([key]) => !key.startsWith('target:'))));
    this.items.controls.forEach(item => item.controls.targetLocationId.setValue('', { emitEvent: false }));
  }
  loadLocations(index = 0) { this.loadLocationOptions(index); }
  loadTargetLocations(index = 0) { this.loadLocationOptions(index, true); }
  private loadLocationOptions(index: number, target = false) {
    const key = this.locationKey(index, target), variant = this.items.at(index)?.controls.variantId.value;
    const targetId = this.operation.controls.targetStoreId.value;
    if (!key || !this.store.selectedStoreId() || (target && !this.targets().some(store => store.id === targetId))) return;
    const state = this.locationCache()[key];
    if (state && !state.failed) return;
    const update = (value: { options: InventoryLocation[]; loading: boolean; failed: boolean }) => this.locationCache.update(cache => ({ ...cache, [key]: value }));
    update({ options: [], loading: true, failed: false });
    this.service.locations(target ? targetId : undefined, variant, !target && this.operation.controls.action.value !== 'IN').pipe(
      takeUntil(this.storeChanged), takeUntil(this.locationReset), takeUntil(target ? this.targetChanged : EMPTY), takeUntilDestroyed(this.destroyRef),
    ).subscribe({ next: options => update({ options, loading: false, failed: false }), error: () => update({ options: [], loading: false, failed: true }) });
  }
  lookupKeydown(event: KeyboardEvent, kind: 'variants' | 'targets' | 'locations' | 'targetLocations', index = 0) {
    if (!['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(event.key)) return;
    if (kind === 'variants') this.loadVariants();
    else if (kind === 'targets') this.loadTargets();
    else if (kind === 'locations') this.loadLocations(index);
    else this.loadTargetLocations(index);
  }
  retryOptions() { if (this.variantsFailed()) this.loadVariants(); if (this.targetsFailed()) this.loadTargets(); }
  focusItem(index: number) {
    this.highlightedItem.set(index);
    const fieldset = this.element.nativeElement.querySelector<HTMLElement>(`#inventory-item-${index}`);
    fieldset?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    fieldset?.querySelector<HTMLSelectElement>('select')?.focus({ preventScroll: true });
  }
  choose(view: View) { if (!this.busy()) this.view.set(view); }
  filter() { this.page.set(1); this.load(); }
  next(delta: number) { const page = this.page() + delta; if (page > 0 && page <= this.totalPages() && !this.loading()) { this.page.set(page); this.load(); } }
  addItem() { if (!this.busy() && this.items.length < 100) this.items.push(this.item()); }
  removeItem(index: number) { if (!this.busy() && this.items.length > 1) this.items.removeAt(index); }
  variant(id: string) { return this.variants().find(variant => variant.id === id); }
  locationLabel(location: StockLocation) {
    if (location.code === '__INVENTORY_GENERAL__') return 'Sin ubicación física asignada';
    const category = location.categoryName === '__INVENTORY_SYSTEM__' ? '' : location.categoryName;
    return [category, [location.code, location.description].filter(Boolean).join(' · ')].filter(Boolean).join(' / ');
  }
  serials(text: string) { return text.split(/[\n,;]+/).map(value => value.trim().toUpperCase()).filter(Boolean); }
  private resetOperation() {
    this.operation.reset({ action: MovementType.IN, reason: MovementReason.PURCHASE, targetStoreId: '', saleId: '', notes: '' }, { emitEvent: false });
    this.items.clear(); this.items.push(this.item());
  }
  saveOperation() {
    if (this.busy() || !this.auth.hasPermission('manage_inventory')) return;
    const storeId = this.store.selectedStoreId(); if (!storeId) return;
    this.operation.markAllAsTouched(); this.error.set('');
    const values = this.operation.getRawValue();
    if (!values.reason) { this.error.set('Selecciona el motivo del movimiento.'); return; }
    if (this.operation.invalid || !values.items.length) { this.error.set('Selecciona variante, ubicación física y una cantidad entera mayor a cero en cada partida.'); return; }
    if (values.action === 'TRANSFER' && !this.targets().some(store => store.id === values.targetStoreId && store.id !== storeId)) { this.error.set('Selecciona una tienda de destino válida.'); return; }
    const seen = new Set<string>();
    const requested = new Map<string, number>();
    for (const [index, item] of values.items.entries()) {
      const variant = this.variant(item.variantId), serials = this.serials(item.serialText);
      if (!this.options(index).some(location => location.id === item.locationId)) { this.error.set('Selecciona una ubicación física de la tienda en cada partida.'); return; }
      if (values.action === 'TRANSFER' && !this.options(index, true).some(location => location.id === item.targetLocationId)) { this.error.set('Selecciona una ubicación de la tienda de destino en cada partida.'); return; }
      if (!variant || !integer(item.quantity)) { this.error.set('Hay una variante o cantidad inválida.'); return; }
      if (values.action === MovementType.IN && !variant.isActive) { this.error.set('No se pueden agregar existencias a una variante inactiva.'); return; }
      if (variant.trackSerialNumbers && serials.length !== Number(item.quantity)) { this.error.set('Captura exactamente un número de serie por cada unidad física de la partida.'); return; }
      if (serials.length > 1000 || new Set(serials).size !== serials.length || serials.some(serial => serial.length > 100 || seen.has(serial))) { this.error.set('Captura hasta 1000 series por partida, sin repetir y con un máximo de 100 caracteres por serie.'); return; }
      if (values.action !== MovementType.IN) {
        const key = `${item.variantId}:${item.locationId}`;
        const quantity = (requested.get(key) ?? 0) + Number(item.quantity);
        requested.set(key, quantity);
        if (quantity > (this.options(index).find(location => location.id === item.locationId)?.existence ?? 0)) {
          this.error.set('La cantidad solicitada supera las existencias de la variante en esa ubicaci\u00f3n.'); return;
        }
      }
      serials.forEach(serial => seen.add(serial));
    }
    const body: InventoryMovementRequest = { reason: values.action === 'TRANSFER' ? MovementReason.TRANSFER : values.reason,
      notes: values.notes.trim() || undefined,
      saleId: values.action !== 'TRANSFER' && [MovementReason.SALE, MovementReason.RETURN].includes(values.reason) ? values.saleId || undefined : undefined,
      items: values.items.map(item => ({ productVariationId: item.variantId, quantity: Number(item.quantity), locationId: item.locationId,
        ...(values.action === 'TRANSFER' ? { targetLocationId: item.targetLocationId } : {}),
        serialNumbers: this.variant(item.variantId)?.trackSerialNumbers ? this.serials(item.serialText) : undefined })),
    };
    const request = values.action === 'TRANSFER' ? this.service.transfer(values.targetStoreId, body)
      : values.action === MovementType.IN ? this.service.add(body) : this.service.discount(body);
    this.busy.set(true);
    request.pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.busy.set(false))).subscribe({
      next: () => { if (storeId !== this.store.selectedStoreId()) return; this.locationReset.next(); this.locationCache.set({}); this.resetOperation(); this.toast.show('Movimiento registrado.', 'success'); this.filter(); },
      error: (response: { error?: { message?: string | string[] } }) => {
        if (storeId !== this.store.selectedStoreId()) return;
        const message = response.error?.message; this.error.set(Array.isArray(message) ? message.join(' ') : message || 'No se pudo registrar el movimiento. Verifica existencias y series.');
      },
    });
  }
  openUnits(variant: StockBalance) { this.unitVariant.set(variant); this.unitPage = 1; this.unitDialog()?.nativeElement.showModal(); this.unitReload.next(); }
  closeUnits() { this.unitDialog()?.nativeElement.close(); this.unitVariant.set(null); this.units.set([]); this.unitsError.set(''); }
  unitsPage(delta: number) { const page = this.unitPage + delta; if (page > 0 && page <= this.unitsTotalPages()) { this.unitPage = page; this.unitReload.next(); } }
}
