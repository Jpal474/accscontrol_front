import { Component, computed, input, output } from '@angular/core';

@Component({
  selector: 'app-pagination',
  standalone: true,
  template: `
    <nav [attr.aria-label]="label()">
      <div class="page-summary">
        <label>Por página
          <select [value]="pageSize()" [disabled]="disabled()" (change)="changeSize($event)">
            @for (size of sizes; track size) {
              <option [value]="size" [selected]="size === pageSize()">{{ size }}</option>
            }
          </select>
        </label>
        @if (total() !== null) {
          <span class="total" aria-live="polite">Mostrando {{ visibleRecords() }} de {{ total() }} Registros</span>
        }
      </div>
      <div class="steps">
        <button type="button" aria-label="Página anterior" [disabled]="disabled() || page() <= 1"
          (click)="pageChange.emit(page() - 1)"><span aria-hidden="true">←</span></button>
        @for (item of pageItems(); track item) {
          @if (item !== 'start-gap' && item !== 'end-gap') {
            <button type="button" class="page-number" [attr.aria-label]="'Página ' + item"
              [attr.aria-current]="item === page() ? 'page' : null" [disabled]="disabled()"
              (click)="goToPage(item)">{{ item }}</button>
          } @else {
            <span class="ellipsis" aria-hidden="true">…</span>
          }
        }
        <button type="button" aria-label="Página siguiente" [disabled]="disabled() || page() >= lastPage()"
          (click)="pageChange.emit(page() + 1)"><span aria-hidden="true">→</span></button>
      </div>
    </nav>
  `,
  styles: [`
    :host { display: block; }
    nav, .page-summary, .steps { display: flex; align-items: center; flex-wrap: wrap; gap: 0.5rem; }
    nav {
      justify-content: space-between;
      gap: 0.5rem 1rem;
      margin-block: 0.25rem 1rem;
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--border);
      border-radius: var(--control-radius);
      background: var(--surface-alt);
    }
    .page-summary { column-gap: 1rem; }
    .steps { justify-content: flex-end; margin-inline-start: auto; max-width: 100%; }
    label { display: flex; align-items: center; gap: 0.5rem; }
    select, button { min-height: 44px; }
    select { border-inline-start: 1px solid var(--border); }
    button {
      min-width: 44px;
      padding-inline: 0.5rem;
      color: var(--text);
      font-size: 1.25rem;
    }
    .page-number { font-size: 0.9rem; }
    .page-number[aria-current='page'] {
      background: var(--accent-soft);
      border-color: var(--accent);
      color: var(--accent);
      font-weight: 700;
    }
    .ellipsis { color: var(--muted); }
    .total { color: var(--muted); font-size: 0.875rem; }
  `],
})
export class PaginationComponent {
  readonly label = input('Paginación');
  readonly page = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly total = input<number | null>(null);
  readonly pageSize = input.required<number>();
  readonly disabled = input(false);
  readonly pageChange = output<number>();
  readonly pageSizeChange = output<number>();
  readonly sizes = [5, 10, 20, 25, 50];
  readonly lastPage = computed(() => Math.max(1, this.totalPages()));
  readonly pageItems = computed(() => {
    const last = this.lastPage();
    if (last <= 6) return Array.from({ length: last }, (_, index) => index + 1);

    const current = this.page();
    if (current <= 2) return [1, 2, 3, 'end-gap', last] as const;
    if (current >= last - 1) return [1, 'start-gap', last - 2, last - 1, last] as const;

    const items: (number | 'start-gap' | 'end-gap')[] = [1];
    if (current > 3) items.push('start-gap');
    items.push(current - 1, current, current + 1);
    if (current < last - 2) items.push('end-gap');
    items.push(last);
    return items;
  });
  readonly visibleRecords = computed(() => {
    const size = this.pageSize();
    const remaining = (this.total() ?? 0) - (this.page() - 1) * size;
    return Math.min(size, Math.max(0, remaining));
  });

  changeSize(event: Event) {
    const size = Number((event.target as HTMLSelectElement).value);
    if (this.sizes.includes(size) && size !== this.pageSize()) this.pageSizeChange.emit(size);
  }

  goToPage(page: number) {
    if (page !== this.page()) this.pageChange.emit(page);
  }
}
