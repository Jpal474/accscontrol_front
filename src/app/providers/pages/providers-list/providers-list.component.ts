import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { InputComponent } from '../../../shared/components/input/input.component';
import { Component, DestroyRef, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { EMPTY, Subject, catchError, combineLatest, debounceTime, distinctUntilChanged, finalize, startWith, switchMap, tap } from 'rxjs';
import { AuthService } from '../../../auth/services/auth.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { SelectedStoreService } from '../../../shared/services/selected-store.service';
import { ToastService } from '../../../shared/services/toast.service';
import { Provider } from '../../interfaces/provider.interface';
import { ProvidersService } from '../../services/providers.service';

interface ProviderSelection {
  provider: Provider;
  storeId: string;
}

@Component({
  selector: 'app-providers-list',
  standalone: true,
  imports: [PaginationComponent, InputComponent, RouterLink, PageHeaderComponent, DataTableComponent, EmptyStateComponent, SkeletonComponent, ConfirmDialogComponent],
  templateUrl: './providers-list.component.html',
  styleUrl: './providers-list.component.scss',
})
export class ProvidersListComponent {
  pageSize = 10;
  changePageSize(size: number) { this.pageSize = size; this.load(1); }
  private readonly providers = inject(ProvidersService);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  readonly store = inject(SelectedStoreService);
  readonly canManage = computed(() => this.auth.hasPermission('manage_providers'));
  readonly list = signal<Provider[]>([]);
  readonly page = signal(1);
  readonly total = signal(0);
  readonly totalPages = signal(0);
  readonly loading = signal(false);
  readonly failed = signal(false);
  readonly changingState = signal(false);
  readonly pending = signal<ProviderSelection | null>(null);
  readonly details = signal<Provider | null>(null);
  readonly detailsLoading = signal(false);
  readonly detailsFailed = signal(false);
  readonly detailsDialog = viewChild<ElementRef<HTMLDialogElement>>('detailsDialog');
  readonly confirmation = viewChild(ConfirmDialogComponent);
  readonly columns = [
    { key: 'commercialName', label: 'Nombre comercial' },
    { key: 'rfc', label: 'RFC' },
    { key: 'phoneNumber', label: 'Teléfono' },
    { key: 'email', label: 'Correo electrónico' },
    { key: 'status', label: 'Estado' },
  ];
  readonly rows = computed(() => this.list().map(provider => ({
    ...provider,
    rfc: provider.rfc || '—',
    status: provider.isActive ? 'Activo' : 'Inactivo',
    disableAction: this.changingState(),
  })));
  readonly actions = computed(() => [
    ...(this.canManage() ? [{ key: 'edit', label: 'Editar' }] : []),
    { key: 'details', label: 'Ver detalles' },
    ...(this.canManage() ? [{ key: 'toggle', label: 'Cambiar estado' }] : []),
  ]);
  readonly detailFields = computed(() => {
    const provider = this.details();
    if (!provider) return [];
    const address = provider.address;
    const locality = address?.locality;
    const municipality = locality?.municipality;
    const state = municipality?.state;
    return [
      { title: 'Datos del proveedor', fields: [
        ['Nombre comercial', provider.commercialName], ['Razón social', provider.fiscalName],
        ['RFC', provider.rfc], ['Teléfono', provider.phoneNumber], ['Correo electrónico', provider.email],
        ['Estado del proveedor', provider.isActive ? 'Activo' : 'Inactivo'],
      ] },
      { title: 'Persona de contacto', fields: [
        ['Nombre', provider.contactName], ['Teléfono de contacto', provider.contactPhone],
        ['Correo de contacto', provider.contactEmail],
      ] },
      { title: 'Dirección', fields: [
        ['Calle', address?.street], ['Número exterior', address?.externalNumber],
        ['Número interior', address?.internalNumber], ['Colonia', address?.neighborhood],
        ['Código postal', address?.postalCode], ['Localidad', locality?.name], ['Municipio', municipality?.name],
        ['Estado', state?.name], ['País', state?.country?.name],
      ] },
    ];
  });

  private readonly reload = new Subject<void>();
  private readonly searchChanges = new Subject<string>();
  private readonly detailRequests = new Subject<ProviderSelection | null>();
  readonly searchText = signal('');
  private searchTerm = '';

  constructor() {
    combineLatest([
      toObservable(this.store.selectedStoreId).pipe(tap(() => {
        this.page.set(1);
        this.pending.set(null);
        this.confirmation()?.close();
        this.closeDetails();
      })),
      this.reload.pipe(startWith(undefined)),
    ]).pipe(
      switchMap(([storeId]) => {
        this.list.set([]);
        this.total.set(0);
        this.totalPages.set(0);
        this.failed.set(false);
        if (!storeId) return EMPTY;
        this.loading.set(true);
        return this.providers.list(this.page(), this.searchTerm, this.pageSize).pipe(
          tap(({ data, meta }) => {
            this.list.set(data);
            this.total.set(meta?.total ?? data.length);
            this.totalPages.set(meta?.totalPages ?? 1);
          }),
          catchError(() => { this.failed.set(true); return EMPTY; }),
          finalize(() => this.loading.set(false)),
        );
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe();

    this.searchChanges.pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(search => {
        this.searchTerm = search;
        this.load(1);
      });

    this.detailRequests.pipe(
      switchMap(selection => {
        this.details.set(null);
        this.detailsFailed.set(false);
        if (!selection) return EMPTY;
        this.detailsLoading.set(true);
        return this.providers.get(selection.provider.id).pipe(
          tap(({ data }) => {
            if (this.store.selectedStoreId() === selection.storeId) this.details.set(data);
          }),
          catchError(() => { this.detailsFailed.set(true); return EMPTY; }),
          finalize(() => this.detailsLoading.set(false)),
        );
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe();
  }

  search(value: string) {
    this.searchText.set(value);
    this.searchChanges.next(value.trim());
  }

  load(page = this.page()) {
    this.page.set(page);
    this.reload.next();
  }

  act(event: { action: string; row: Record<string, string | number> }) {
    const storeId = this.store.selectedStoreId();
    const provider = this.list().find(item => item.id === event.row['id']);
    if (!provider || !storeId) return;
    if (event.action === 'details') {
      this.detailRequests.next({ provider, storeId });
      this.detailsDialog()?.nativeElement.showModal();
    } else if (this.canManage() && event.action === 'edit') {
      void this.router.navigate(['/app/edit-provider', provider.id]);
    } else if (this.canManage() && event.action === 'toggle' && !this.changingState()) {
      this.pending.set({ provider, storeId });
      this.confirmation()?.open();
    }
  }

  closeDetails() {
    const dialog = this.detailsDialog()?.nativeElement;
    if (dialog?.open) dialog.close();
    this.detailRequests.next(null);
  }

  toggle() {
    const selection = this.pending();
    if (!selection || !this.canManage() || this.changingState() || selection.storeId !== this.store.selectedStoreId()) return;
    this.pending.set(null);
    this.changingState.set(true);
    this.providers.toggle(selection.provider.id).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.changingState.set(false)),
    ).subscribe({
      next: ({ data }) => {
        if (selection.storeId !== this.store.selectedStoreId()) return;
        this.list.update(items => items.map(item => item.id === selection.provider.id ? { ...item, isActive: data } : item));
        this.toast.show(data ? 'Proveedor activado.' : 'Proveedor desactivado.', 'success');
      },
      error: () => {
        if (selection.storeId === this.store.selectedStoreId()) this.toast.show('No se pudo cambiar el estado.', 'error');
      },
    });
  }
}
