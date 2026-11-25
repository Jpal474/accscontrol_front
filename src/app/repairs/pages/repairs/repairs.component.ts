import { Component, DestroyRef, afterNextRender, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EMPTY, Subject, catchError, combineLatest, finalize, startWith, switchMap, tap } from 'rxjs';
import { AuthService } from '../../../auth/services/auth.service';
import { CatalogSelectComponent } from '../../../shared/components/catalog-select/catalog-select.component';
import { CatalogRequest } from '../../../shared/interfaces/catalogs.interface';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { RoutesService } from '../../../shared/services/routes.service';
import { SelectedStoreService } from '../../../shared/services/selected-store.service';
import { productCurrencySymbol } from '../../../products/utils/product-money';
import { Repair, RepairLookups, RepairsService } from '../../repairs.service';

@Component({
  selector: 'app-repairs',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, RouterLink, PageHeaderComponent, CatalogSelectComponent],
  templateUrl: './repairs.component.html',
  styleUrl: './repairs.component.scss',
})
export class RepairsComponent {
  private readonly service = inject(RepairsService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly queue = signal<string | null>(null);
  private readonly destroyRef = inject(DestroyRef);
  readonly store = inject(SelectedStoreService);
  readonly routes = inject(RoutesService).routes.app;
  readonly canManage = computed(() => this.auth.hasPermission('manage_repairs'));
  private readonly fullList = computed(() => this.canManage() || this.auth.hasPermission('view_repairs'));
  private readonly ownTechnician = computed(() => this.fullList() ? undefined : this.auth.currentUser()?.id);
  private readonly requests = new Subject<{ page: number; search: string }>();
  readonly fetchClients = (query: CatalogRequest) => this.service.options('clients', query);
  readonly fetchTechnicians = (query: CatalogRequest) => this.service.options('technicians', query);
  readonly fetchModels = (query: CatalogRequest) => this.service.options('models', query);
  readonly rows = signal<Repair[]>([]);
  readonly lookups = signal<RepairLookups | null>(null);
  readonly currency = computed(() => this.lookups()?.currency ?? null);
  readonly currencySymbol = computed(() => productCurrencySymbol(this.currency()));
  readonly groups = computed(() => {
    const groups = new Map<string, { label: string; rows: Repair[] }>();
    for (const row of this.rows()) {
      const id = row.repairState?.id ?? '';
      const group = groups.get(id) ?? { label: row.repairState?.name ?? 'Sin estado', rows: [] };
      group.rows.push(row);
      groups.set(id, group);
    }
    return [...groups].map(([id, group]) => ({ id, ...group }));
  });
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly lookupLoading = signal(false);
  readonly error = signal('');
  readonly lookupError = signal('');
  readonly formError = signal('');
  readonly page = signal(1);
  readonly pages = signal(0);
  readonly total = signal(0);
  search = '';
  private appliedSearch = '';
  readonly form = inject(FormBuilder).nonNullable.group({
    clientId: ['', Validators.required],
    technicianId: ['', Validators.required],
    deviceModelId: ['', Validators.required],
    repairStateId: ['', Validators.required],
    description: ['', [Validators.pattern(/\S/), Validators.required, Validators.maxLength(2000)]],
    notes: ['', Validators.maxLength(2000)],
    serialNumber: ['', Validators.maxLength(100)],
    price: ['0', [Validators.required, Validators.pattern(/^\d{1,8}(\.\d{1,2})?$/)]],
  });

  constructor() {
    if (this.route.snapshot.fragment === 'recibir-equipo') {
      afterNextRender(() => document.getElementById('recibir-equipo')?.focus());
    }
    const storeChanges = toObservable(this.store.selectedStoreId);
    combineLatest([storeChanges, toObservable(this.ownTechnician), this.route.queryParamMap]).pipe(
      switchMap(([storeId, technicianId, params]) => {
        const queueParam = params.get('queue');
        const queue = queueParam === 'open' || queueParam === 'older' ? queueParam : undefined;
        const repairStateId = queue ? params.get('repairStateId') ?? undefined : undefined;
        this.queue.set(queue ?? null);
        this.rows.set([]);
        this.error.set('');
        this.page.set(1);
        this.pages.set(0);
        this.total.set(0);
        if (!storeId || (!technicianId && !this.fullList())) return EMPTY;
        return this.requests.pipe(startWith({ page: 1, search: this.appliedSearch }), switchMap(request => {
          this.loading.set(true);
          this.error.set('');
          return this.service.list(request.page, request.search, technicianId, { queue, repairStateId }).pipe(
            tap(({ data, meta }) => { this.rows.set(data); this.page.set(request.page); this.pages.set(meta?.totalPages ?? 1); this.total.set(meta?.total ?? data.length); }),
            catchError(() => { this.error.set('No se pudieron cargar las reparaciones.'); return EMPTY; }),
            finalize(() => this.loading.set(false)),
          );
        }));
      }), takeUntilDestroyed(this.destroyRef),
    ).subscribe();

    storeChanges.pipe(
      switchMap(storeId => {
        this.form.reset();
        this.lookups.set(null);
        this.formError.set('');
        this.lookupError.set('');
        if (!storeId || !this.canManage()) return EMPTY;
        this.lookupLoading.set(true);
        return this.service.lookups().pipe(
          tap(({ data }) => this.lookups.set(data)),
          catchError(() => { this.lookupError.set('No se pudieron cargar los catálogos de recepción.'); return EMPTY; }),
          finalize(() => this.lookupLoading.set(false)),
        );
      }), takeUntilDestroyed(this.destroyRef),
    ).subscribe();
  }

  load(page?: number) {
    if (page === undefined) this.appliedSearch = this.search.trim();
    this.requests.next({ page: page ?? 1, search: this.appliedSearch });
  }

  invalid(field: keyof typeof this.form.controls) {
    const control = this.form.controls[field];
    return control.touched && control.invalid;
  }

  receive() {
    const storeId = this.store.selectedStoreId();
    if (!storeId || !this.canManage() || this.busy() || this.lookupLoading()) return;
    this.form.markAllAsTouched();
    this.formError.set('');
    if (this.form.invalid) { this.formError.set('Revisa los datos de recepción indicados.'); return; }
    const values = this.form.getRawValue();
    this.busy.set(true);
    this.service.create({
      ...values, description: values.description.trim(), notes: values.notes.trim() || undefined,
      serialNumber: values.serialNumber.trim() || undefined, price: Number(values.price), receivedDate: new Date().toISOString(),
    }).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.busy.set(false))).subscribe({
      next: ({ data }) => {
        if (this.store.selectedStoreId() !== storeId) return;
        this.form.reset();
        void this.router.navigateByUrl(this.routes.repairDetail(data.id));
      },
      error: err => {
        if (this.store.selectedStoreId() === storeId) this.formError.set(err.message || 'No se pudo registrar la reparación.');
      },
    });
  }
}
