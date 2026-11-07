import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import {
  OwnersListApiRequest,
  OwnersListApiResponse,
} from '../../interfaces/owner.interface';
import { StoreService } from '../../services/store.service';
import {
  debounceTime,
  delay,
  distinctUntilChanged,
  finalize,
  Subject,
  takeUntil,
} from 'rxjs';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { RoutesService } from '../../../shared/services/routes.service';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-store-owners-list',
  standalone: true,
  imports: [
    CommonModule,
    DataTableComponent,
    SkeletonComponent,
    EmptyStateComponent,
    FormsModule,
  ],
  templateUrl: './owners-list.component.html',
  styleUrl: './owners-list.component.scss',
})
export class OwnersListComponent implements OnInit {
  private readonly router = inject(Router);
  readonly storesService = inject(StoreService);
  readonly routesService = inject(RoutesService);
  public params: OwnersListApiRequest = {
    page: 1,
    pageSize: 10,
  };
  readonly columns = [
    { key: 'name', label: 'Nombre' },
    { key: 'lastName', label: 'Primer Apellido' },
    { key: 'email', label: 'Correo Electrónico' },
    { key: 'stores', label: 'Tiendas' },
  ];
  public actions = [
    { key: 'edit', label: 'Editar' },
    { key: 'toggle', label: 'Cambiar Estado', disable: false },
  ];
  readonly owners = signal<OwnersListApiResponse[]>([]);
  readonly busy = signal<boolean>(false);
  readonly loading = signal(true);
  readonly failed = signal(false);
  readonly totalPages = signal(0);
  readonly totalRegisters = signal(0);
  readonly showStoreSelector = signal<boolean>(false);
  readonly selectedOwnerForToggle = signal<any | null>(null);
  readonly storesToToggle = signal<
    { storeId: string; name: string; isActive: boolean; selected?: boolean }[]
  >([]);
  private readonly searchSubject = new Subject<string>();
  private readonly destroy$ = new Subject<void>();
  private readonly toastService = inject(ToastService);

  ngOnInit() {
    this.loadOwners(1);

    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((query) => {
        this.params.search = query;
        this.loading.set(true);
        this.loadOwners(1);
      });
  }

  public loadOwners(page = 1) {
    if (this.busy()) return;

    this.busy.set(true);
    this.params.page = page;

    this.storesService
      .listStoreOwners(this.params)
      .pipe(
        delay(200),
        finalize(() => {
          this.busy.set(false);
          this.loading.set(false);
        }),
      )
      .subscribe({
        next: (response) => {
          this.owners.set(response.data);
          if (response.meta) {
            this.totalRegisters.set(response.meta.total);
            // Calculamos las páginas totales de forma segura
            const limit = this.params.pageSize || 10;
            this.totalPages.set(Math.ceil(response.meta.total / limit) || 1);
          }
          this.failed.set(false);
        },
        error: () => {
          this.failed.set(true);
        },
      });
  }

  formattedOwners() {
    return this.owners().map((owner: any) => {
      // Determinamos de antemano si este dueño específico debe tener deshabilitado el toggle
      const hasNoStores = !owner.stores || owner.stores.length === 0;

      return {
        ...owner,
        statusLabel: owner.isActive ? 'Activo' : 'Inactivo',
        // Guardamos un booleano listo para usarse en la tabla
        disableAction: hasNoStores,
        stores:
          Array.isArray(owner.stores) && owner.stores.length > 0
            ? owner.stores
                .map((s: any) => {
                  const statusText = s.staffActive ? 'Activo' : 'Inactivo';
                  return `${s.name} (${statusText})`;
                })
                .join(', ')
            : 'Sin tiendas',
      };
    });
  }

  handleRowAction(event: { action: string; row: Record<string, any> }) {
    const { action, row } = event;

    if (action === 'edit') {
      this.editOwner(row);
    } else if (action === 'toggle') {
      console.log('toggle');
      this.toggleStatus(row);
    }
  }

  editOwner(row: Record<string, any>) {
    this.routesService.redirectTo(
      this.routesService.routes.app.owner.edit(row['id']),
    );
  }

  toggleStatus(row: Record<string, any>) {
    const originalOwner = this.owners().find((o: any) => o.id === row['id']);
    const stores = originalOwner ? originalOwner.stores : [];

    if (Array.isArray(stores) && stores.length > 0) {
      this.selectedOwnerForToggle.set(originalOwner);
      this.storesToToggle.set(
        stores.map((s: any) => ({
          storeId: s.id || s.storeId,
          name: s.name || `Tienda ${s.id}`,
          isActive: s.staffActive ?? true,
          selected: false,
        })),
      );
      this.showStoreSelector.set(true);
    } else {
      console.warn('Este usuario no tiene tiendas asociadas.');
    }
  }
  confirmarCambioConTiendas() {
    const owner = this.selectedOwnerForToggle();
    if (!owner) return;
    const targetStoreIds = this.storesToToggle()
      .filter((s: any) => s.selected)
      .map((s) => s.storeId);

    if (targetStoreIds.length === 0) {
      alert('Por favor selecciona al menos una tienda.');
      return;
    }

    this.ejecutarCambioEstado(owner['id'], targetStoreIds);
    this.cerrarSelector();
  }

  cerrarSelector() {
    this.showStoreSelector.set(false);
    this.selectedOwnerForToggle.set(null);
    this.storesToToggle.set([]);
  }

  private ejecutarCambioEstado(ownerId: string, storeIds: string[]) {
    this.storesService.toggleStoreOwner(ownerId, storeIds).subscribe({
      next: () => {
        this.toastService.show(
          'Estatus actualizado correctamente en las tiendas',
          'success',
        );
        this.loadOwners(this.params.page);
      },
      error: (err) => {
        console.error('Error al cambiar el estatus en las tiendas:', err);
      },
    });
  }
  navigateToCreate() {
    this.routesService.redirectTo(this.routesService.routes.app.owner.register);
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
