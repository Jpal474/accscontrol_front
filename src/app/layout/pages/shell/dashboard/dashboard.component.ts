import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, catchError, combineLatest, firstValueFrom, map, of, startWith, switchMap, tap } from 'rxjs';
import { AuthService } from '../../../../auth/services/auth.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { RoutesService } from '../../../../shared/services/routes.service';
import { SelectedStoreService } from '../../../../shared/services/selected-store.service';
import { DashboardService, DashboardSummary, ReportFilters, ReportKind } from './dashboard.service';

const kindLabels: Record<ReportKind, string> = {
  sales: 'Ventas', profit: 'Utilidad bruta', inventory: 'Inventario', repairs: 'Reparaciones',
};
const initialFilters: ReportFilters = { kind: '', from: '', to: '', categoryId: '', userId: '' };

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, EmptyStateComponent, PageHeaderComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  private readonly service = inject(DashboardService);
  private readonly store = inject(SelectedStoreService);
  readonly auth = inject(AuthService);
  private readonly requests = new Subject<{ filters: ReportFilters; page: number }>();
  private applied = initialFilters;
  readonly selectedStore = this.store.selectedStoreId;
  readonly data = signal<DashboardSummary | null>(null);
  readonly result = computed(() => this.data()?.report);
  readonly kinds = computed(() => (this.data()?.kinds ?? []).map(kind => ({ kind, label: kindLabels[kind] })));
  readonly busy = signal(false);
  readonly exporting = signal(false);
  readonly error = signal('');
  readonly routes = inject(RoutesService).routes.app;
  readonly shellHasSelector = computed(() => this.auth.currentUser()?.stores?.some(
    (membership: { role: string | null }) => membership.role?.toLowerCase() === 'owner',
  ));
  readonly form = inject(FormBuilder).nonNullable.group({
    kind: ['' as ReportFilters['kind']],
    from: ['', Validators.required],
    to: ['', Validators.required],
    categoryId: '',
    userId: '',
  });
  readonly summaryEntries = computed(() => Object.entries(this.result()?.summary ?? {}));
  readonly labels: Record<string, string> = {
    sales: 'Ventas completadas', revenue: 'Importe de ventas', cancellations: 'Ventas canceladas',
    amount: 'Total', date: 'Fecha', status: 'Estado', folio: 'Folio', product: 'Producto',
    cost: 'Costo', grossProfit: 'Utilidad bruta', estimatedCostItems: 'Partidas con costo estimado',
    lineCount: 'Partidas', quantity: 'Cantidad', description: 'Descripción', quoted: 'Importe cotizado',
    pending: 'Pendientes', delivered: 'Entregadas', variations: 'Variantes', inStock: 'Existencias',
    location: 'Ubicación', sku: 'SKU',
  };

  constructor() {
    toObservable(this.selectedStore).pipe(
      tap(() => {
        this.data.set(null);
        this.form.reset(initialFilters);
        this.applied = initialFilters;
      }),
      switchMap(storeId => this.requests.pipe(
        startWith({ filters: initialFilters, page: 1 }),
        switchMap(({ filters, page }) => {
          this.busy.set(true);
          this.error.set('');
          return this.service.summary(storeId, filters, page).pipe(
            map(response => ({ data: response.data, filters })),
            catchError(() => {
              this.error.set('No se pudo consultar el dashboard. Intenta nuevamente.');
              return of(null);
            }),
          );
        }),
      )),
      takeUntilDestroyed(),
    ).subscribe(response => {
      this.busy.set(false);
      if (!response) return;
      const { data, filters } = response;
      this.data.set(data);
      if (!data.report) return;
      const { kind, period } = data.report;
      this.form.patchValue({ kind, ...period }, { emitEvent: false });
      this.applied = { ...filters, kind, ...period };
    });

    this.form.controls.kind.valueChanges.pipe(takeUntilDestroyed()).subscribe(kind => {
      this.form.patchValue({ categoryId: '', userId: '' }, { emitEvent: false });
      if (kind) this.load();
    });
  }

  selectStore(event: Event) {
    this.store.setSelectedStore((event.target as HTMLSelectElement).value || null);
  }

  load(page = 1, keepFilters = false) {
    const filters = { ...(keepFilters ? this.applied : this.form.getRawValue()) };
    if (this.result() && filters.kind !== 'inventory' && (!filters.from || !filters.to)) {
      this.error.set('Selecciona las fechas del reporte.');
      return;
    }
    if (filters.from && filters.to && filters.from > filters.to) {
      this.error.set('La fecha inicial debe ser anterior o igual a la final.');
      return;
    }
    if (filters.kind === 'inventory') {
      filters.from = '';
      filters.to = '';
      filters.userId = '';
    }
    if (filters.kind === 'repairs') filters.categoryId = '';
    this.requests.next({ filters, page });
  }

  display(key: string, value: string | number | null | undefined, currency = this.result()?.store.currency): string {
    if (value == null) return '—';
    if (key === 'status' && value === 'COMPLETED') return 'Completada';
    if (key === 'status' && value === 'CANCELLED') return 'Cancelada';
    if (currency && /^[A-Z]{3}$/.test(currency) && ['revenue', 'amount', 'cost', 'grossProfit', 'quoted'].includes(key)) {
      return new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(Number(value));
    }
    return typeof value === 'number' ? value.toLocaleString('es-MX') : String(value);
  }

  async download() {
    const report = this.result();
    if (!report || this.exporting()) return;
    const filters = { ...this.applied };
    const storeId = report.store.id;
    const lines = [report.columns.map(column => this.csv(this.labels[column] ?? column)).join(',')];
    this.exporting.set(true);
    this.error.set('');
    try {
      const pages = Math.ceil(report.total / report.pageSize);
      for (let page = 1; page <= pages; page++) {
        const { data } = await firstValueFrom(this.service.summary(storeId, filters, page));
        if (storeId !== this.selectedStore()) return;
        if (!data.report) throw new Error('Missing report');
        for (const row of data.report.rows) lines.push(report.columns.map(column => this.csv(row[column])).join(','));
      }
      const url = URL.createObjectURL(new Blob(['\uFEFF', lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `accscontrol-${report.kind}-${report.period.from}.csv`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      this.error.set('No se pudo exportar el reporte. Intenta nuevamente.');
    } finally {
      this.exporting.set(false);
    }
  }

  private csv(value: string | number | null): string {
    let text = value == null ? '' : String(value);
    if (/^[\s]*[=+@-]|^[\t\r\n]/.test(text) && !/^-?\d+(\.\d+)?$/.test(text)) text = "'" + text;
    return '"' + text.replaceAll('"', '""') + '"';
  }
}
