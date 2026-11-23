import { DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { EMPTY, Observable, Subject, catchError, combineLatest, finalize, startWith, switchMap, tap } from 'rxjs';
import { AuthService } from '../../../auth/services/auth.service';
import { formatProductMoney } from '../../../products/utils/product-money';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { RoutesService } from '../../../shared/services/routes.service';
import { SelectedStoreService } from '../../../shared/services/selected-store.service';
import { Sale, SalesService } from '../../sales.service';

@Component({
  selector: 'app-sale-detail',
  standalone: true,
  imports: [RouterLink, DatePipe, PageHeaderComponent, ConfirmDialogComponent],
  templateUrl: './sale-detail.component.html',
  styleUrl: './sale-detail.component.scss',
})
export class SaleDetailComponent {
  private readonly service = inject(SalesService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly requests = new Subject<number>();
  private readonly confirmation = viewChild(ConfirmDialogComponent);
  readonly auth = inject(AuthService);
  readonly store = inject(SelectedStoreService);
  readonly routes = inject(RoutesService).routes.app;
  readonly sale = signal<Sale | null>(null);
  readonly history = signal<Sale[]>([]);
  readonly page = signal(1);
  readonly totalPages = signal(0);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly loadError = signal('');
  readonly actionError = signal('');

  constructor() {
    combineLatest([toObservable(this.store.selectedStoreId), this.route.paramMap]).pipe(
      switchMap(([storeId, params]) => {
        this.page.set(1);
        this.totalPages.set(0);
        this.sale.set(null);
        this.history.set([]);
        this.loadError.set('');
        this.actionError.set('');
        if (!storeId) return EMPTY;
        const id = params.get('saleId');
        return this.requests.pipe(startWith(1), switchMap(page => {
          this.loading.set(true);
          this.loadError.set('');
          const request: Observable<unknown> = id
            ? this.service.detail(id).pipe(tap(({ data }) => this.sale.set(data)))
            : this.service.list(!this.auth.hasPermission('view_all_sales'), page).pipe(tap(({ data, meta }) => {
              this.history.set(data);
              this.page.set(page);
              this.totalPages.set(meta?.totalPages ?? 1);
            }));
          return request.pipe(
            catchError(() => {
              this.loadError.set(id ? 'No se pudo abrir esta venta en la tienda seleccionada.' : 'No se pudieron cargar las ventas.');
              return EMPTY;
            }),
            finalize(() => this.loading.set(false)),
          );
        }));
      }), takeUntilDestroyed(this.destroyRef),
    ).subscribe();
  }

  load(page = this.page()) { this.requests.next(page); }

  money(value: number | string, sale: Sale) {
    const currency = sale.store?.currency?.name?.trim().toUpperCase();
    return formatProductMoney(value, currency ? { id: '', code: currency, description: '' } : null);
  }

  print() { window.print(); }

  askToCancel() {
    if (!this.busy() && this.sale()?.status === 'COMPLETED' && this.auth.hasPermission('cancel_sales')) {
      this.confirmation()?.open();
    }
  }

  cancel() {
    const sale = this.sale();
    const storeId = this.store.selectedStoreId();
    if (!storeId || !sale || sale.status !== 'COMPLETED' || this.busy() || !this.auth.hasPermission('cancel_sales')) return;
    this.busy.set(true);
    this.actionError.set('');
    this.service.cancel(sale.id).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.busy.set(false))).subscribe({
      next: () => {
        if (this.store.selectedStoreId() === storeId && this.sale()?.id === sale.id) {
          this.sale.set({ ...sale, status: 'CANCELLED' });
        }
      },
      error: err => {
        if (this.store.selectedStoreId() === storeId && this.sale()?.id === sale.id) {
          this.actionError.set(err.message || 'No se pudo cancelar la venta.');
        }
      },
    });
  }
}
