import { DatePipe } from '@angular/common';
import { Component, DestroyRef, ElementRef, EventEmitter, Input, OnChanges, Output, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { EMPTY, Subject, catchError, finalize, switchMap, takeUntil, tap, timer } from 'rxjs';
import { InventoryService } from '../../services/inventory.service';
import { InventorySale } from '../../interfaces/inventory.interface';
import { SelectedStoreService } from '../../../shared/services/selected-store.service';
import { formatProductMoney } from '../../../products/utils/product-money';

@Component({
  selector: 'app-inventory-sale-selector', standalone: true, imports: [DatePipe],
  templateUrl: './inventory-sale-selector.component.html', styleUrl: './inventory-sale-selector.component.scss',
  host: { '(focusout)': 'focusOut($event)', '(window:resize)': 'positionPanel()' },
})
export class InventorySaleSelectorComponent implements OnChanges {
  private readonly service = inject(InventoryService);
  private readonly store = inject(SelectedStoreService);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly requests = new Subject<{ page: number; delay: boolean }>();
  private readonly reset = new Subject<void>();
  @Output() saleIdChange = new EventEmitter<string>();
  @Input() saleId = '';
  readonly open = signal(false);
  readonly panelBefore = signal(false);
  readonly sales = signal<InventorySale[]>([]);
  readonly selected = signal<InventorySale | null>(null);
  readonly loading = signal(false);
  readonly failed = signal(false);
  readonly totalPages = signal(0);
  readonly page = signal(1);
  readonly active = signal(0);
  query = '';
  private loaded = false;

  ngOnChanges() {
    if (!this.saleId && this.selected()) { this.selected.set(null); this.query = ''; this.loaded = false; this.sales.set([]); this.open.set(false); }
  }

  constructor() {
    toObservable(this.store.selectedStoreId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.reset.next(); this.open.set(false); this.sales.set([]); this.selected.set(null);
      this.query = ''; this.loaded = false; this.loading.set(false); this.failed.set(false); this.page.set(1); this.totalPages.set(0);
    });
    this.requests.pipe(switchMap(({ page, delay }) => {
      this.loading.set(true); this.failed.set(false);
      const folio = this.query.trim();
      return timer(delay ? 250 : 0).pipe(switchMap(() => this.service.sales(folio, page)), takeUntil(this.reset),
        tap(response => {
          this.sales.set(page === 1 ? response.data : [...this.sales(), ...response.data]);
          this.page.set(page); this.totalPages.set(response.meta?.totalPages ?? 1); this.loaded = true; this.active.set(0);
        }), catchError(() => { this.failed.set(true); return EMPTY; }), finalize(() => this.loading.set(false)));
    }), takeUntilDestroyed(this.destroyRef)).subscribe();
  }
  focus() {
    if (!this.store.selectedStoreId()) return;
    this.positionPanel();
    this.open.set(true);
    if (!this.loaded && !this.loading()) this.load();
  }
  positionPanel() {
    const element = this.element.nativeElement;
    const width = element.ownerDocument.defaultView?.innerWidth ?? 0;
    this.panelBefore.set(element.getBoundingClientRect().right + 16 + Math.min(440, width * .4) > width - 16);
  }
  load(page = 1) { this.requests.next({ page, delay: false }); }
  search(value: string) {
    this.query = value; this.selected.set(null); this.saleIdChange.emit(''); this.sales.set([]); this.loaded = false;
    this.open.set(true); this.requests.next({ page: 1, delay: true });
  }
  choose(sale: InventorySale) {
    this.selected.set(sale); this.query = sale.folio; this.saleIdChange.emit(sale.id); this.open.set(false);
  }
  clear() { this.selected.set(null); this.query = ''; this.saleIdChange.emit(''); this.loaded = false; this.sales.set([]); }
  focusOut(event: FocusEvent) { if (!this.element.nativeElement.contains(event.relatedTarget as Node | null)) this.open.set(false); }
  keydown(event: KeyboardEvent) {
    if (event.key === 'Escape') { this.open.set(false); event.preventDefault(); }
    else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault(); this.focus();
      this.active.update(index => Math.max(0, Math.min(this.sales().length - 1, index + (event.key === 'ArrowDown' ? 1 : -1))));
      this.element.nativeElement.querySelector(`#inventory-sale-${this.active()}`)?.scrollIntoView({ block: 'nearest' });
    } else if (event.key === 'Enter' && this.open()) {
      event.preventDefault(); const sale = this.sales()[this.active()]; if (sale && !this.loading()) this.choose(sale);
    }
  }
  money(sale: InventorySale) { return formatProductMoney(sale.total, sale.currency ? { id: '', description: '', code: sale.currency } : null); }
}
