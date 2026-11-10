import { Component, inject, PLATFORM_ID, signal } from '@angular/core';
import {
  StoreListResponse,
  StoreParams,
} from '../../interfaces/store.interface';
import { RoutesService } from '../../../shared/services/routes.service';
import { StoreService } from '../../services/store.service';
import { Router } from '@angular/router';
import {
  debounceTime,
  delay,
  distinctUntilChanged,
  finalize,
  Subject,
  takeUntil,
} from 'rxjs';
import { ToastService } from '../../../shared/services/toast.service';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from '../../../auth/services/auth.service';

@Component({
  selector: 'app-stores-list',
  standalone: true,
  imports: [SkeletonComponent, EmptyStateComponent, DataTableComponent],
  templateUrl: './stores-list.component.html',
  styleUrl: './stores-list.component.scss',
})
export class StoresListComponent {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly router = inject(Router);
  readonly storesService = inject(StoreService);
  readonly authService = inject(AuthService);
  readonly routesService = inject(RoutesService);
  public params: StoreParams = {
    page: 1,
    pageSize: 10,
  };
  readonly columns = [
    { key: 'name', label: 'Nombre' },
    { key: 'address', label: 'Dirección' },
    { key: 'currency', label: 'Moneda' },
    { key: 'statusLabel', label: 'Estatus' },
  ];
  public actions = [
    { key: 'edit', label: 'Editar' },
    { key: 'toggle', label: 'Cambiar Estado', disable: false },
  ];
  readonly stores = signal<StoreListResponse[]>([]);
  readonly busy = signal<boolean>(false);
  readonly loading = signal(true);
  readonly failed = signal(false);
  readonly totalPages = signal(0);
  readonly totalRegisters = signal(0);
  readonly isOwner = signal(true);
  readonly showStoreSelector = signal<boolean>(false);
  readonly selectedOwnerForToggle = signal<any | null>(null);
  readonly storesToToggle = signal<
    { storeId: string; name: string; isActive: boolean; selected?: boolean }[]
  >([]);
  private readonly searchSubject = new Subject<string>();
  private readonly destroy$ = new Subject<void>();
  private readonly toastService = inject(ToastService);

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.isOwner.set(this.authService.hasPermission('manage_store'));
    this.loadStores(1);
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((query) => {
        this.params.search = query;
        this.loading.set(true);
        this.loadStores(1);
      });
  }

  public loadStores(page = 1) {
    if (this.busy()) return;

    this.busy.set(true);
    this.params.page = page;
    const request$ = this.isOwner()
      ? this.storesService.getStoresPerOwner(this.params)
      : this.storesService.getAllStores(this.params);

    request$
      .pipe(
        finalize(() => {
          this.busy.set(false);
          this.loading.set(false);
        }),
      )
      .subscribe({
        next: (response) => {
          this.stores.set(response.data);
          if (response.meta) {
            this.totalRegisters.set(response.meta.total);
            this.totalPages.set(response.meta.totalPages);
          }
          this.failed.set(false);
        },
        error: () => {
          this.failed.set(true);
        },
      });
  }

  formattedStores() {
    return this.stores().map((stores: StoreListResponse) => {
      return {
        ...stores,
        statusLabel: stores.isActive ? 'Activo' : 'Inactivo',
      };
    });
  }

  handleRowAction(event: { action: string; row: Record<string, any> }) {
    const { action, row } = event;

    if (action === 'edit') {
      this.editStore(row);
    } else if (action === 'toggle') {
      console.log('toggle');
      this.toggleState(row);
    }
  }

  editStore(row: Record<string, any>) {
    this.routesService.redirectTo(
      this.routesService.routes.app.store.edit(row['id']),
    );
  }

  private toggleState(row: Record<string, any>) {
    this.storesService.toggleStore(row['id']).subscribe({
      next: () => {
        this.toastService.show(
          'Estatus de tienda actualizado correctamente',
          'success',
        );
        this.loadStores(this.params.page);
      },
      error: (err) => {
        console.error('Error al cambiar el estatus de la tienda:', err);
      },
    });
  }
  navigateToCreate() {
    this.routesService.redirectTo(this.routesService.routes.app.store.register);
  }

  onSearch(event: Event) {
    const query = (event.target as HTMLInputElement).value;
    this.searchSubject.next(query);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
