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
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
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
  // OJO: data ahora es un ARREGLO (CatalogApiResponse[])
  @Input({ required: true }) fetchFn!: (
    query: CatalogRequest,
  ) => Observable<ApiStandardResponse<CatalogApiResponse[]>>;
  @Input() parentId?: string | null;
  /** Si es true, no carga nada hasta que exista parentId */
  @Input() parentRequired = false;
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

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  private readonly elementRef = inject(ElementRef);
  private readonly platformId = inject(PLATFORM_ID);

  constructor() {
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((queryText) => {
        this.search.set(queryText);
        this.currentPage = 1;
        this.loadData(true);
      });
  }

  /** Verdadero si el selector puede consultar datos */
  get canLoad(): boolean {
    return !this.parentRequired || !!this.parentId;
  }

  ngOnInit() {
    // Evita ejecutar la petición en el servidor (SSR)
    if (!isPlatformBrowser(this.platformId)) return;
    if (!this.canLoad) return;
    this.loadData(true);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['parentId'] && !changes['parentId'].firstChange) {
      // 🛑 Ya NO limpiamos el selectedId ni el onChange aquí,
      // para permitir que el formulario conserve el ID que se está cargando o editando.
      this.items.set([]);
      this.search.set('');
      this.currentPage = 1;
      this.totalPages = 1;

      if (isPlatformBrowser(this.platformId) && this.canLoad) {
        this.loadData(true);
      }
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
    // No abrir si depende de un padre que aún no se ha seleccionado
    if (!this.canLoad) return;

    this.isOpen.update((v) => !v);
    if (this.isOpen() && this.items().length === 0 && !this.loading()) {
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

  // Scroll infinito
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
          // data es un arreglo; la paginación viene en meta
          const newItems: CatalogApiResponse[] = response.data ?? [];
          this.totalPages = response.meta?.totalPages ?? 1;

          if (reset) {
            this.items.set(newItems);
          } else {
            this.items.update((current) => [...current, ...newItems]);
          }

          this.syncSelectedLabel();
        },
        error: (err) => {
          console.error('Error al cargar catálogo:', err);
        },
      });
  }

  /** Si hay un id seleccionado (ej. modo edición), recupera su texto */
  private syncSelectedLabel() {
    const id = this.selectedId();
    if (!id || this.selectedValue()) return;
    const found = this.items().find((i) => i.id === id);
    if (found) this.selectedValue.set(found.value);
  }

  // ControlValueAccessor
  writeValue(value: string | { id: string; value: string } | null): void {
    if (!value) {
      this.selectedId.set(null);
      this.selectedValue.set('');
      return;
    }

    if (typeof value === 'object' && value.id) {
      // Si el backend te manda el objeto completo { id, value }
      this.selectedId.set(value.id);
      this.selectedValue.set(value.value);
    } else if (typeof value === 'string') {
      // Si solo manda el ID plano
      this.selectedId.set(value);
      this.syncSelectedLabel();
    }
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
}
