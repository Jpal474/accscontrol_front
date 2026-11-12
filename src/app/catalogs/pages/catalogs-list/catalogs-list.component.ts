import { Component, DestroyRef, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { EMPTY, Subject, catchError, combineLatest, debounceTime, distinctUntilChanged, finalize, startWith, switchMap, tap } from 'rxjs';
import { CatalogsService } from '../../services/catalogs.service';
import { CatalogEntry, CatalogKind, MANAGED_CATALOGS } from '../../interfaces/catalog.interface';
import { AuthService } from '../../../auth/services/auth.service';
import { SelectedStoreService } from '../../../shared/services/selected-store.service';
import { ToastService } from '../../../shared/services/toast.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
@Component({ selector: 'app-catalogs-list', standalone: true,
  imports: [FormsModule, RouterLink, PageHeaderComponent, DataTableComponent, SkeletonComponent, ConfirmDialogComponent],
  templateUrl: './catalogs-list.component.html', styleUrl: './catalogs-list.component.scss' })
export class CatalogsListComponent {
  private readonly service = inject(CatalogsService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toast = inject(ToastService);
  readonly store = inject(SelectedStoreService);
  readonly definitions = MANAGED_CATALOGS.filter(item => this.auth.hasPermission(item.permission));
  readonly kind = signal<CatalogKind>(this.definitions[0]?.key || 'payment-methods');
  readonly definition = computed(() => this.definitions.find(item => item.key === this.kind()));
  readonly loading = signal(false); readonly failed = signal(false); readonly busy = signal(false);
  readonly entries = signal<CatalogEntry[]>([]); readonly total = signal(0); readonly pages = signal(0);
  readonly pending = signal<{ id: string; storeId: string; kind: CatalogKind } | null>(null);
  readonly dialog = viewChild.required(ConfirmDialogComponent);
  private readonly reload = new Subject<void>(); private readonly searchChanges = new Subject<string>();
  private query = ''; search = ''; page = 1;
  readonly columns = [{ key: 'label', label: 'Nombre / código' }, { key: 'description', label: 'Descripción' }, { key: 'status', label: 'Estatus' }];
  readonly actions = [{ key: 'toggle', label: 'Cambiar estado' }];
  readonly rows = computed(() => this.entries().map(item => ({ ...item, label: item.name || item.model || item.code,
    description: item.description || '—', status: item.isActive ? 'Activo' : 'Inactivo', disableAction: this.busy() })));
  constructor() {
    const initial = inject(ActivatedRoute).snapshot.queryParamMap.get('kind');
    if (this.definitions.some(item => item.key === initial)) this.kind.set(initial as CatalogKind);
    combineLatest([toObservable(this.store.selectedStoreId), toObservable(this.kind)]).pipe(
      tap(() => { this.page = 1; this.pending.set(null); }),
      switchMap(([storeId, kind]) => this.reload.pipe(startWith(undefined), switchMap(() => {
        this.entries.set([]); this.failed.set(false); this.total.set(0); this.pages.set(0);
        if (!storeId || !this.definitions.some(item => item.key === kind)) { this.loading.set(false); return EMPTY; }
        this.loading.set(true);
        return this.service.list(kind, { page: this.page, search: this.query }).pipe(
          tap(response => { this.entries.set(response.data); this.total.set(response.meta?.total || 0); this.pages.set(response.meta?.totalPages || 0); }),
          catchError(() => { this.failed.set(true); return EMPTY; }), finalize(() => this.loading.set(false)),
        );
      }))), takeUntilDestroyed(this.destroyRef),
    ).subscribe();
    this.searchChanges.pipe(debounceTime(500), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(value => { this.query = value; this.load(1); });
  }
  onSearch(value: string) { this.search = value; this.searchChanges.next(value.trim()); }
  load(page = this.page) { this.page = page; this.reload.next(); }
  handleAction(event: { action: string; row: Record<string, any> }) {
    const storeId = this.store.selectedStoreId();
    if (event.action !== 'toggle' || this.busy() || !storeId) return;
    this.pending.set({ id: event.row['id'], storeId, kind: this.kind() }); this.dialog().open();
  }
  toggle() {
    const pending = this.pending();
    if (!pending || this.busy() || pending.storeId !== this.store.selectedStoreId() || pending.kind !== this.kind()) return;
    this.busy.set(true);
    this.service.toggle(pending.kind, pending.id).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.busy.set(false))).subscribe({
      next: response => {
        if (pending.storeId !== this.store.selectedStoreId() || pending.kind !== this.kind()) return;
        this.entries.update(entries => entries.map(item => item.id === pending.id ? { ...item, isActive: response.data } : item));
        this.pending.set(null); this.toast.show('Estado actualizado.', 'success');
      }, error: () => this.toast.show('No se pudo actualizar el estado.', 'error'),
    });
  }
}
