import { Component, DestroyRef, computed, inject, signal, viewChild } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, debounceTime, distinctUntilChanged, finalize, map, of, startWith, switchMap } from 'rxjs';
import { AdminService } from '../../services/admin.service';
import { PlatformUser } from '../../interfaces/admin.interface';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { ToastService } from '../../../shared/services/toast.service';
import { translateRoleName } from '../../../shared/i18n/roles.es';
import { CatalogSelectComponent } from '../../../shared/components/catalog-select/catalog-select.component';
import { CatalogRequest } from '../../../shared/interfaces/catalogs.interface';

@Component({
  selector: 'app-users-list', standalone: true,
  imports: [ReactiveFormsModule, CatalogSelectComponent, PageHeaderComponent, DataTableComponent, SkeletonComponent, ConfirmDialogComponent],
  templateUrl: './users-list.component.html', styleUrl: './users-list.component.scss',
})
export class UsersListComponent {
  private readonly service = inject(AdminService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly reload = new Subject<void>();
  private readonly searchChanges = new Subject<string>();
  readonly users = signal<PlatformUser[]>([]);
  readonly loading = signal(false);
  readonly failed = signal(false);
  readonly busy = signal(false);
  readonly page = signal(1);
  readonly totalPages = signal(0);
  readonly total = signal(0);
  readonly selected = signal<PlatformUser | null>(null);
  readonly targetActive = signal(false);
  readonly confirmationMessage = computed(() => this.targetActive()
    ? `Se activará el acceso global de ${this.selected()?.email || ''}.`
    : `Se desactivará el acceso global de ${this.selected()?.email || ''}, incluidas sus sesiones abiertas.`);
  readonly dialog = viewChild.required(ConfirmDialogComponent);
  private search = '';
  readonly roleControl = new FormControl<string | null>(null);
  readonly storeControl = new FormControl<string | null>(null);
  readonly fetchRoles = (query: CatalogRequest) => this.service.listRoles(query).pipe(
    map(response => ({ ...response, data: response.data.map(role => ({ ...role, value: translateRoleName(role.value) })) })),
  );
  readonly fetchStores = (query: CatalogRequest) => this.service.listStores(query);
  readonly columns = [
    { key: 'name', label: 'Nombre' }, { key: 'lastName', label: 'Apellidos' },
    { key: 'email', label: 'Correo' }, { key: 'roles', label: 'Roles' }, { key: 'status', label: 'Estatus' },
    { key: 'stores', label: 'Tiendas' },
  ];
  readonly actions = [{ key: 'activate', label: 'Activar' }, { key: 'deactivate', label: 'Desactivar' }];
  readonly rows = computed(() => this.users().map(user => ({
    ...user,
    roles: [...new Set([user.globalRole?.name, ...(user.storeStaff ?? []).map(staff => staff.role?.name)]
      .filter((name): name is string => !!name).map(translateRoleName))].join(', ') || 'Sin rol',
    status: user.isActive ? 'Activo' : 'Inactivo', deactivateDisabled: !user.isActive || this.busy(),
    activateDisabled: user.isActive || this.busy(),
    stores: [...new Set((user.storeStaff ?? []).map(staff => staff.store?.name).filter(Boolean))].join(', ') || 'Sin tienda',
  })));
  constructor() {
    this.reload.pipe(startWith(undefined), switchMap(() => {
      this.loading.set(true); this.failed.set(false);
      return this.service.listUsers({ page: this.page(), search: this.search,
        roleId: this.roleControl.value || undefined, storeId: this.storeControl.value || undefined }).pipe(
        catchError(() => { this.failed.set(true); return of(null); }),
        finalize(() => this.loading.set(false)),
      );
    }), takeUntilDestroyed(this.destroyRef)).subscribe(response => {
      if (!response) return;
      this.users.set(response.data); this.total.set(response.meta?.total ?? response.data.length);
      this.totalPages.set(response.meta?.totalPages ?? 1);
    });
    this.searchChanges.pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(search => { this.search = search; this.load(1); });
    this.roleControl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load(1));
    this.storeControl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load(1));
  }
  clearRole() { this.roleControl.reset(); }
  clearStore() { this.storeControl.reset(); }
  onSearch(event: Event) { this.searchChanges.next((event.target as HTMLInputElement).value); }
  load(page = this.page()) { this.page.set(page); this.reload.next(); }
  handleAction(event: { action: string; row: Record<string, any> }) {
    if (!['activate', 'deactivate'].includes(event.action) || this.busy()) return;
    const user = this.users().find(user => user.id === event.row['id']);
    const isActive = event.action === 'activate';
    if (!user || user.isActive === isActive) return;
    this.targetActive.set(isActive);
    this.selected.set(user); this.dialog().open();
  }
  changeStatus() {
    const user = this.selected();
    if (!user || this.busy()) return;
    this.busy.set(true);
    this.service.setUserStatus(user.id, this.targetActive()).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.busy.set(false)))
      .subscribe({
        next: response => {
          this.users.update(users => users.map(item => item.id === user.id ? { ...item, isActive: response.data.isActive } : item));
          this.selected.set(null); this.toast.show('Estado del usuario actualizado.', 'success');
        },
        error: () => this.toast.show('No se pudo actualizar el estado del usuario.', 'error'),
      });
  }
}
