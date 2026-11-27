import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
﻿import { AssistedRecoveryDialogComponent } from '../../../auth/components/assisted-recovery-dialog/assisted-recovery-dialog.component';
import { viewChild, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { EMPTY, Subject, catchError, combineLatest, finalize, startWith, switchMap, tap } from 'rxjs';
import { Router, RouterLink } from '@angular/router';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { SelectedStoreService } from '../../../shared/services/selected-store.service';
import { ToastService } from '../../../shared/services/toast.service';
import { StoreStaffItem } from '../../interfaces/staff.interface';
import { StaffService } from '../../services/staff.service';
import { translateRoleName } from '../../../shared/i18n/roles.es';

import { AuthService } from '../../../auth/services/auth.service';
import { RoutesService } from '../../../shared/services/routes.service';

@Component({
  selector: 'app-staff-list',
  standalone: true,
  imports: [PaginationComponent, AssistedRecoveryDialogComponent, PageHeaderComponent, SkeletonComponent, DataTableComponent, RouterLink],
  templateUrl: './staff-list.component.html',
  styleUrl: './staff-list.component.scss',
})
export class StaffListComponent {
  pageSize = 10;
  changePageSize(size: number) { this.pageSize = size; this.load(1); }
  readonly assistedRecovery = viewChild.required(AssistedRecoveryDialogComponent);
  readonly auth = inject(AuthService);
  readonly registerRoute = inject(RoutesService).routes.app.staff.register;
  readonly selectedStore = inject(SelectedStoreService);
  private readonly staffService = inject(StaffService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly reload$ = new Subject<void>();
  readonly loading = signal(false);
  readonly failed = signal(false);
  readonly busy = signal(false);
  readonly members = signal<StoreStaffItem[]>([]);
  readonly page = signal(1);
  readonly totalPages = signal(0);
  readonly columns = [
    { key: 'name', label: 'Nombre' },
    { key: 'lastName', label: 'Apellidos' },
    { key: 'roleName', label: 'Rol dentro de la Tienda' },
    { key: 'contact', label: 'Datos de Contacto' },
    { key: 'statusLabel', label: 'Estatus' },
  ];
  readonly actions = [
    { key: 'edit', label: 'Editar' },
    { key: 'toggle', label: 'Cambiar Estado' },
    { key: 'recover', label: 'Restablecer acceso' },
  ];
  readonly ownsSelectedStore = computed(() => {
    const user = this.auth.currentUser();
    const storeId = this.selectedStore.selectedStoreId();
    return !this.auth.hasPermission('manage_platform_admins')
      && !!user?.stores?.some((store: { storeId: string; role: string }) =>
        store.storeId === storeId && store.role === 'Owner');
  });
  readonly rows = computed(() => this.members().map(member => ({
    id: member.id,
    recoverHidden: !this.ownsSelectedStore() || !member.isActive || member.role.name === 'Owner'
      || member.user.id === this.auth.currentUser()?.id || member.user.isActive === false
      || member.user.recoveryEmailVerified,
    name: member.user.name,
    lastName: member.user.lastName,
    roleName: translateRoleName(member.role.name),
    contact: `${member.user.email} · ${member.user.phone || 'Sin teléfono'}`,
    statusLabel: member.isActive ? 'Activo' : 'Inactivo',
    disableAction: this.busy(),
    editDisabled: this.busy(),
  })));

  constructor() {
    combineLatest([
      toObservable(this.selectedStore.selectedStoreId).pipe(tap(() => this.page.set(1))),
      this.reload$.pipe(startWith(undefined)),
    ]).pipe(
      switchMap(([storeId]) => {
        this.members.set([]);
        this.failed.set(false);
        this.totalPages.set(0);
        if (!storeId) {
          this.loading.set(false);
          return EMPTY;
        }
        this.loading.set(true);
        return this.staffService.listStaff(this.page(), this.pageSize).pipe(
          tap(response => {
            this.members.set(response.data);
            this.totalPages.set(response.meta?.totalPages ?? 1);
          }),
          catchError(() => {
            this.failed.set(true);
            return EMPTY;
          }),
          finalize(() => this.loading.set(false)),
        );
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe();
  }

  load(page = this.page()) {
    this.page.set(page);
    this.reload$.next();
  }

  handleRowAction(event: { action: string; row: Record<string, any> }) {
    if (this.busy()) return;
    const staffId = event.row['id'] as string;
    if (event.action === 'recover') {
      const member = this.members().find(item => item.id === staffId);
      const storeId = this.selectedStore.selectedStoreId();
      if (member && storeId) void this.assistedRecovery().open(member.user.id, storeId);
      return;
    }
    if (event.action === 'edit') {
      void this.router.navigate(['/app/edit-staff', staffId]);
      return;
    }
    if (event.action !== 'toggle') return;
    const storeId = this.selectedStore.selectedStoreId();
    this.busy.set(true);
    this.staffService.toggleStaff(staffId).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.busy.set(false)),
    ).subscribe({
      next: response => {
        if (storeId !== this.selectedStore.selectedStoreId()) return;
        this.members.update(members => members.map(member => member.id === staffId
          ? { ...member, isActive: response.data.isActive } : member));
        this.toastService.show('Estatus del personal actualizado correctamente', 'success');
      },
      error: () => this.toastService.show('No se pudo cambiar el estado del personal.', 'error'),
    });
  }
}
