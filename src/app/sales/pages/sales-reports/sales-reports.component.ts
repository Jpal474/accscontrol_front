import { InputComponent } from '../../../shared/components/input/input.component';
import { DecimalPipe } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { EMPTY, Subject, catchError, finalize, startWith, switchMap, tap } from 'rxjs';
import { AuthService } from '../../../auth/services/auth.service';
import { ProductsService } from '../../../products/services/products.service';
import { StoreCurrency } from '../../../products/interfaces/product.interface';
import { formatProductMoney } from '../../../products/utils/product-money';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { SelectedStoreService } from '../../../shared/services/selected-store.service';
import { ReportPeriod, SalesReports, SalesService } from '../../sales.service';

@Component({
  selector: 'app-sales-reports',
  standalone: true,
  imports: [InputComponent, ReactiveFormsModule, DecimalPipe, PageHeaderComponent, SkeletonComponent],
  templateUrl: './sales-reports.component.html',
  styleUrl: './sales-reports.component.scss',
})
export class SalesReportsComponent {
  readonly store = inject(SelectedStoreService);
  private readonly auth = inject(AuthService);
  private readonly sales = inject(SalesService);
  private readonly products = inject(ProductsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly requests = new Subject<ReportPeriod>();
  private readonly initialPeriod = this.currentMonth();
  readonly filters = inject(FormBuilder).nonNullable.group({
    startDate: [this.initialPeriod.startDate, Validators.required],
    endDate: [this.initialPeriod.endDate, Validators.required],
  });
  readonly report = signal<SalesReports | null>(null);
  readonly currency = signal<StoreCurrency | null>(null);
  readonly period = signal(this.initialPeriod);
  readonly loading = signal(false);
  readonly failed = signal(false);
  readonly filterError = signal('');
  readonly maxDailyRevenue = computed(() => (this.report()?.daily ?? [])
    .reduce((max, day) => Math.max(max, Number(day.totalAmount)), 0));

  constructor() {
    const storeChanges = toObservable(this.store.selectedStoreId);
    storeChanges.pipe(
      switchMap(storeId => {
        this.report.set(null);
        this.failed.set(false);
        if (!storeId) return EMPTY;
        return this.requests.pipe(startWith(this.period()), switchMap(period => {
          this.loading.set(true);
          this.failed.set(false);
          this.report.set(null);
          return this.sales.reports(period).pipe(
            tap(report => { this.period.set(period); this.report.set(report); }),
            catchError(() => { this.failed.set(true); return EMPTY; }),
            finalize(() => this.loading.set(false)),
          );
        }));
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe();

    storeChanges.pipe(
      switchMap(storeId => {
        this.currency.set(null);
        const canViewCurrency = this.auth.hasPermission('view_products') || this.auth.hasPermission('manage_products');
        return storeId && canViewCurrency ? this.products.currency().pipe(catchError(() => EMPTY)) : EMPTY;
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(({ data }) => this.currency.set(data));
  }

  load() {
    if (!this.store.selectedStoreId()) return;
    const { startDate, endDate } = this.filters.getRawValue();
    if (this.filters.invalid || startDate > endDate) {
      this.filters.markAllAsTouched();
      this.filterError.set(this.filters.invalid ? 'Selecciona ambas fechas.' : 'La fecha inicial debe ser anterior o igual a la fecha final.');
      return;
    }
    this.filterError.set('');
    this.period.set({ startDate, endDate });
    this.requests.next({ startDate, endDate });
  }

  money(value: number | string) { return formatProductMoney(value, this.currency()); }

  day(value: string) {
    const [year, month, day] = value.slice(0, 10).split('-');
    return `${day}/${month}/${year}`;
  }

  private currentMonth(): ReportPeriod {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const prefix = `${today.getFullYear()}-${month}`;
    return { startDate: `${prefix}-01`, endDate: `${prefix}-${String(today.getDate()).padStart(2, '0')}` };
  }
}
