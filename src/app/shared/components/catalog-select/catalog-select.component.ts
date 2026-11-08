import {
  Component,
  Input,
  forwardRef,
  signal,
  inject,
  ElementRef,
  HostListener,
  OnChanges,
  SimpleChanges,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  FormsModule,
} from '@angular/forms';
import { Observable, Subject } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  takeUntil,
  finalize,
} from 'rxjs/operators';
import {
  CatalogApiResponse,
  CatalogRequest,
} from '../../interfaces/catalogs.interface';
import { ApiStandardResponse } from '../../interfaces/api-response.interface';

@Component({
  selector: 'app-catalog-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './catalog-select.component.html',
  styleUrl: './catalog-select.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CatalogSelectComponent),
      multi: true,
    },
  ],
})
export class CatalogSelectComponent
  implements ControlValueAccessor, OnInit, OnChanges, OnDestroy
{
  @Input({ required: true }) fetchFn!: (
    query: CatalogRequest,
  ) => Observable<ApiStandardResponse<CatalogApiResponse>>;
  @Input() parentId?: string | null; // Útil para recargar si cambia el país/estado padre
  @Input() placeholder = 'Selecciona una opción...';

  readonly isOpen = signal(false);
  readonly search = signal('');
  readonly items = signal<CatalogApiResponse[]>([]);
  readonly loading = signal(false);
  readonly loadingMore = signal(false);
  readonly selectedValue = signal<string>('');
  readonly selectedId = signal<string | null>(null);

  private currentPage = 1;
  private pageSize = 10;
  private totalPages = 1;
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  private onChange: any = () => {};
  private onTouched: any = () => {};

  private readonly elementRef = inject(ElementRef);

  constructor() {
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((queryText) => {
        this.search.set(queryText);
        this.currentPage = 1;
        this.loadData(true);
      });
  }

  ngOnInit() {
    this.loadData(true);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['parentId'] && !changes['parentId'].firstChange) {
      // Si el elemento padre cambia (ej. cambias de país), limpiamos la selección y recargamos
      this.selectedId.set(null);
      this.selectedValue.set('');
      this.onChange('');
      this.currentPage = 1;
      this.loadData(true);
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }

  public toggleDropdown() {
    this.isOpen.update((v) => !v);
    if (this.isOpen() && this.items().length === 0) {
      this.loadData(true);
    }
  }

  public onSearchInput(event: Event) {
    const val = (event.target as HTMLInputElement).value;
    this.searchSubject.next(val);
  }

  public selectItem(item: CatalogApiResponse) {
    this.selectedId.set(item.id);
    this.selectedValue.set(item.value);
    this.onChange(item.id);
    this.onTouched();
    this.isOpen.set(false);
  }

  // Control de scroll infinito
  public onScroll(event: Event) {
    const element = event.target as HTMLElement;
    const atBottom =
      element.scrollHeight - element.scrollTop <= element.clientHeight + 20;

    if (atBottom && !this.loadingMore() && this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadData(false);
    }
  }

  private loadData(reset: boolean) {
    if (!this.fetchFn) return;

    if (reset) {
      this.loading.set(true);
    } else {
      this.loadingMore.set(true);
    }

    const query: CatalogRequest = {
      page: this.currentPage,
      pageSize: this.pageSize,
      search: this.search() || undefined,
    };

    this.fetchFn(query)
      .pipe(
        finalize(() => {
          this.loading.set(false);
          this.loadingMore.set(false);
        }),
      )
      .subscribe({
        next: (response) => {
          // Adaptable a la estructura estándar de tu API (response.data o response directo)
          const payload: any = response.data || response;
          const newItems = payload.items || [];
          this.totalPages = payload.totalPages || 1;

          if (reset) {
            this.items.set(newItems);
          } else {
            this.items.update((current) => [...current, ...newItems]);
          }
        },
        error: (err) => {
          console.error('Error al cargar catálogo:', err);
        },
      });
  }

  // Métodos de ControlValueAccessor
  writeValue(value: any): void {
    if (value) {
      this.selectedId.set(value);
    } else {
      this.selectedId.set(null);
      this.selectedValue.set('');
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }
}
