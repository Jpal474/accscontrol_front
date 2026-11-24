import { DatePipe } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EMPTY, Observable, Subject, catchError, combineLatest, finalize, startWith, switchMap, tap } from 'rxjs';
import { AuthService } from '../../../auth/services/auth.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { CatalogSelectComponent } from '../../../shared/components/catalog-select/catalog-select.component';
import { CatalogRequest } from '../../../shared/interfaces/catalogs.interface';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { RoutesService } from '../../../shared/services/routes.service';
import { SelectedStoreService } from '../../../shared/services/selected-store.service';
import { formatProductMoney, productCurrencySymbol } from '../../../products/utils/product-money';
import { RepairDetail, RepairLookups, RepairStock, RepairsService } from '../../repairs.service';

@Component({
  selector: 'app-repair-detail',
  standalone: true,
  imports: [DatePipe, FormsModule, ReactiveFormsModule, RouterLink, PageHeaderComponent, CatalogSelectComponent, ConfirmDialogComponent],
  templateUrl: './repair-detail.component.html',
  styleUrl: './repair-detail.component.scss',
})
export class RepairDetailComponent {
  private readonly service = inject(RepairsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly deleteDialog = viewChild(ConfirmDialogComponent);
  private pendingDelete: { id: string; storeId: string } | null = null;
  private readonly destroyRef = inject(DestroyRef);
  private readonly auth = inject(AuthService);
  readonly store = inject(SelectedStoreService);
  readonly repairsRoute = inject(RoutesService).routes.app.repairs;
  private readonly reload = new Subject<void>();
  private readonly reloadLookups = new Subject<void>();
  private readonly stockRequests = new Subject<{ search: string; page: number }>();
  readonly detail = signal<RepairDetail | null>(null);
  readonly fetchTechnicians = (query: CatalogRequest) => this.service.options('technicians', query);
  readonly currentTechnician = computed(() => {
    const technician = this.detail()?.repair.technician;
    return technician ? { id: technician.id, value: [technician.name, technician.lastName].filter(Boolean).join(' ') } : undefined;
  });
  readonly lookups = signal<RepairLookups | null>(null);
  readonly currency = computed(() => this.lookups()?.currency ?? null);
  readonly currencySymbol = computed(() => productCurrencySymbol(this.currency()));
  readonly canManage = computed(() => this.auth.hasPermission('manage_repairs'));
  readonly canWork = computed(() => this.canManage() || (this.auth.hasPermission('update_assigned_repairs')
    && this.detail()?.repair.technicianId === this.auth.currentUser()?.id));
  readonly isOpen = computed(() => !!this.detail()?.repair.isActive && !this.detail()?.repair.deliveredDate);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly actionError = signal('');
  readonly notice = signal('');
  readonly stockRows = signal<RepairStock[]>([]);
  readonly stockPage = signal(1);
  readonly stockPages = signal(0);
  readonly stockLoading = signal(false);
  readonly stockError = signal('');
  stockSearch = '';
  private appliedStockSearch = '';
  readonly selected = signal('');
  readonly stockOptions = computed(() => this.stockRows().flatMap(product => product.locations.map(location => ({
    key: product.productVariationId + ':' + location.id, product, location,
  }))));
  readonly selectedOption = computed(() => this.stockOptions().find(option => option.key === this.selected()));

  private readonly fb = inject(FormBuilder);
  readonly edit = this.fb.nonNullable.group({
    technicianId: ['', Validators.required],
    description: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(2000)]],
    notes: ['', Validators.maxLength(2000)],
    price: ['', [Validators.required, Validators.pattern(/^\d{1,8}(\.\d{1,2})?$/)]],
  });
  readonly workflow = this.fb.nonNullable.group({ repairStateId: ['', Validators.required], deliver: false, notes: ['', Validators.maxLength(2000)] });
  readonly parts = this.fb.group({ quantity: this.fb.control<number>(1, { validators: [Validators.required, Validators.min(1), Validators.max(1000)] }), serials: this.fb.nonNullable.control('') });

  constructor() {
    const context = combineLatest([toObservable(this.store.selectedStoreId), this.route.paramMap]);
    context.pipe(
      switchMap(([store, params]) => {
        this.detail.set(null);
        this.lookups.set(null);
        this.error.set('');
        this.notice.set('');
        this.actionError.set('');
        const id = params.get('repairId');
        if (!store || !id) return EMPTY;
        return this.reload.pipe(startWith(undefined), switchMap(() => {
          this.loading.set(true);
          this.error.set('');
          return this.service.detail(id).pipe(
            tap(({ data }) => {
              this.detail.set(data);
              const repair = data.repair;
              this.edit.reset({ technicianId: repair.technicianId, description: repair.description,
                notes: repair.notes ?? '', price: String(repair.price) });
              this.workflow.reset({ repairStateId: repair.repairStateId, deliver: false, notes: repair.notes ?? '' });
            }),
            catchError(() => { this.detail.set(null); this.error.set('No se pudo cargar la reparación de esta tienda.'); return EMPTY; }),
            finalize(() => this.loading.set(false)),
          );
        }));
      }), takeUntilDestroyed(this.destroyRef),
    ).subscribe();

    context.pipe(switchMap(([store, params]) =>
      store && params.get('repairId') && (this.canManage() || this.auth.hasPermission('update_assigned_repairs'))
        ? this.reloadLookups.pipe(startWith(undefined), switchMap(() => this.service.lookups().pipe(catchError(() => {
          this.error.set('No se pudieron cargar los estados o técnicos de la tienda.'); return EMPTY;
        })))) : EMPTY),
    takeUntilDestroyed(this.destroyRef)).subscribe(({ data }) => this.lookups.set(data));

    context.pipe(switchMap(([store, params]) => {
      const id = params.get('repairId');
      this.clearStock();
      this.stockSearch = this.appliedStockSearch = '';
      return store && id ? this.stockRequests.pipe(switchMap(request => {
        this.clearStock();
        this.stockLoading.set(true);
        return this.service.stock(id, request.search, request.page).pipe(
          tap(({ data, meta }) => { this.stockRows.set(data); this.stockPage.set(request.page); this.stockPages.set(meta?.totalPages ?? 1); }),
          catchError(() => { this.stockError.set('No se pudo consultar el inventario para esta reparación.'); return EMPTY; }),
          finalize(() => this.stockLoading.set(false)),
        );
      })) : EMPTY;
    }), takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  retry() {
    this.reload.next();
    this.reloadLookups.next();
  }
  money(value: number | string) { return formatProductMoney(value, this.currency()); }

  save() {
    this.edit.markAllAsTouched();
    if (this.edit.invalid || !this.canManage()) return;
    this.run(id => {
      const value = this.edit.getRawValue();
      return this.service.update(id, { ...value, description: value.description.trim(), notes: value.notes.trim(), price: Number(value.price) });
    }, 'Datos actualizados.');
  }

  saveState() {
    this.workflow.markAllAsTouched();
    if (this.workflow.invalid || !this.canWork() || !this.isOpen()) return;
    const { repairStateId, deliver, notes } = this.workflow.getRawValue();
    this.run(id => this.service.state(id, repairStateId, deliver, notes.trim()), deliver ? 'Entrega registrada.' : 'Estado actualizado.');
  }

  askToDelete() {
    const id = this.detail()?.repair.id;
    const storeId = this.store.selectedStoreId();
    if (!id || !storeId || !this.canManage() || this.busy() || this.loading()) return;
    this.pendingDelete = { id, storeId };
    this.deleteDialog()?.open();
  }

  deleteRepair() {
    const pending = this.pendingDelete;
    this.pendingDelete = null;
    if (!pending || !this.canManage() || this.detail()?.repair.id !== pending.id
      || this.store.selectedStoreId() !== pending.storeId) return;
    this.run(id => this.service.remove(id), 'Reparación eliminada.', false, () => {
      this.detail.set(null);
      void this.router.navigateByUrl(this.repairsRoute);
    });
  }

  searchStock(page?: number) {
    if (!this.canWork() || !this.isOpen() || this.busy()) return;
    if (page === undefined) this.appliedStockSearch = this.stockSearch.trim();
    this.stockRequests.next({ search: this.appliedStockSearch, page: page ?? 1 });
  }

  chooseStock(value: string) {
    this.selected.set(value);
    this.parts.reset({ quantity: 1, serials: '' });
    this.stockError.set('');
  }

  consume() {
    const option = this.selectedOption();
    const { quantity, serials } = this.parts.getRawValue();
    this.stockError.set('');
    if (!option) { this.stockError.set('Selecciona una refacción y su ubicación de origen.'); return; }
    if (quantity === null || !Number.isInteger(quantity) || quantity < 1 || quantity > Math.min(option.location.existence, 1000)) {
      this.stockError.set('Indica una cantidad entera entre 1 y las piezas disponibles, con un máximo de 1000.');
      return;
    }
    const serialNumbers = serials.split(/\r?\n/).map(value => value.trim().toUpperCase()).filter(Boolean);
    if (option.product.trackSerialNumbers && (serialNumbers.length !== quantity || new Set(serialNumbers).size !== quantity
      || serialNumbers.some(value => value.length > 100))) {
      this.stockError.set('Captura un número de serie diferente por pieza, uno por línea, de hasta 100 caracteres.');
      return;
    }
    if (!this.canWork() || !this.isOpen()) return;
    this.run(id => this.service.consume(id, {
      productVariationId: option.product.productVariationId, locationId: option.location.id, quantity,
      ...(option.product.trackSerialNumbers ? { serialNumbers } : {}),
    }), 'Refacción descontada del inventario.', true);
  }

  private clearStock() {
    this.stockRows.set([]);
    this.stockPages.set(0);
    this.chooseStock('');
  }

  private run(request: (id: string) => Observable<unknown>, message: string, refreshStock = false, onSuccess?: () => void) {
    const storeId = this.store.selectedStoreId();
    const id = this.detail()?.repair.id;
    if (!storeId || !id || this.busy() || this.loading()) return;
    const matches = () => this.store.selectedStoreId() === storeId && this.route.snapshot.paramMap.get('repairId') === id;
    this.actionError.set('');
    this.notice.set('');
    this.busy.set(true);
    request(id).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.busy.set(false))).subscribe({
      next: () => {
        if (!matches()) return;
        this.notice.set(message);
        if (onSuccess) { onSuccess(); return; }
        this.reload.next();
        if (refreshStock) this.stockRequests.next({ search: this.appliedStockSearch, page: this.stockPage() });
      },
      error: err => {
        if (matches()) this.actionError.set(err.message || 'No se pudo actualizar la reparación.');
      },
    });
  }
}
