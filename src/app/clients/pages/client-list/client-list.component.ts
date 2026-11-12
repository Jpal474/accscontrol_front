import { Component, DestroyRef, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { EMPTY, Subject, catchError, combineLatest, debounceTime, distinctUntilChanged, finalize, startWith, switchMap, tap } from 'rxjs';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { SelectedStoreService } from '../../../shared/services/selected-store.service';
import { ToastService } from '../../../shared/services/toast.service';
import { AuthService } from '../../../auth/services/auth.service';
import { Client } from '../../interfaces/client.interface';
import { ClientsService } from '../../services/clients.service';

@Component({
  selector: 'app-client-list', standalone: true,
  imports: [FormsModule, RouterLink, PageHeaderComponent, DataTableComponent, SkeletonComponent, ConfirmDialogComponent],
  templateUrl: './client-list.component.html', styleUrl: './client-list.component.scss',
})
export class ClientListComponent {
  private readonly service = inject(ClientsService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toast = inject(ToastService);
  readonly selectedStore = inject(SelectedStoreService);
  readonly auth = inject(AuthService);
  private readonly reload = new Subject<void>();
  private readonly searchChanges = new Subject<string>();
  private appliedSearch = '';
  readonly clients = signal<Client[]>([]);
  readonly error = signal('');
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly total = signal(0);
  readonly totalPages = signal(0);
  readonly pending = signal<Client | null>(null);
  private pendingStore: string | null = null;
  readonly dialog = viewChild.required(ConfirmDialogComponent);
  page = 1;
  search = '';
  readonly columns = [
    { key: 'name', label: 'Nombre' }, { key: 'lastName', label: 'Apellidos' },
    { key: 'email', label: 'Correo' }, { key: 'phoneNumber', label: 'Teléfono' }, { key: 'status', label: 'Estatus' },
  ];
  readonly actions = computed(() => this.auth.hasPermission('manage_clients')
    ? [{ key: 'edit', label: 'Editar' }, { key: 'toggle', label: 'Cambiar estado' }] : []);
  readonly rows = computed(() => this.clients().map(client => ({ ...client,
    status: client.isActive ? 'Activo' : 'Inactivo', disableAction: this.busy(), editDisabled: this.busy(),
  })));
  constructor() {
    combineLatest([
      toObservable(this.selectedStore.selectedStoreId).pipe(tap(() => { this.page = 1; this.pending.set(null); })),
      this.reload.pipe(startWith(undefined)),
    ]).pipe(switchMap(([storeId]) => {
      this.clients.set([]); this.error.set(''); this.total.set(0); this.totalPages.set(0);
      if (!storeId) { this.loading.set(false); return EMPTY; }
      this.loading.set(true);
      return this.service.list({ page: this.page, search: this.appliedSearch }).pipe(
        tap(response => {
          this.clients.set(response.data); this.total.set(response.meta?.total ?? response.data.length);
          this.totalPages.set(response.meta?.totalPages ?? 1);
        }),
        catchError(() => { this.error.set('No se pudieron cargar los clientes. Intenta nuevamente.'); return EMPTY; }),
        finalize(() => this.loading.set(false)),
      );
    }), takeUntilDestroyed(this.destroyRef)).subscribe();
    this.searchChanges.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(search => {
      this.appliedSearch = search;
      this.load(1);
    });
  }
  onSearch(value: string) {
    this.search = value;
    this.searchChanges.next(value.trim());
  }
  load(page = this.page) { this.page = page; this.reload.next(); }
  handleAction(event: { action: string; row: Record<string, any> }) {
    if (this.busy() || !this.auth.hasPermission('manage_clients')) return;
    const client = this.clients().find(client => client.id === event.row['id']);
    if (!client) return;
    if (event.action === 'edit') { void this.router.navigate(['/app/edit-client', client.id]); return; }
    if (event.action === 'toggle') {
      this.pending.set(client); this.pendingStore = this.selectedStore.selectedStoreId(); this.dialog().open();
    }
  }
  toggle() {
    const client = this.pending();
    const storeId = this.pendingStore;
    if (!client || !storeId || storeId !== this.selectedStore.selectedStoreId() || this.busy()) return;
    this.busy.set(true);
    this.service.toggle(client.id).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.busy.set(false))).subscribe({
      next: response => {
        if (storeId !== this.selectedStore.selectedStoreId()) return;
        this.clients.update(clients => clients.map(item => item.id === client.id ? { ...item, isActive: response.data } : item));
        this.pending.set(null); this.toast.show('Estado del cliente actualizado.', 'success');
      },
      error: () => this.toast.show('No se pudo cambiar el estado del cliente.', 'error'),
    });
  }
}
