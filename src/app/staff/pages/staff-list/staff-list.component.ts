import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { EMPTY, Subject, catchError, combineLatest, finalize, startWith, switchMap, tap } from 'rxjs';
import { Router } from '@angular/router';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { SelectedStoreService } from '../../../shared/services/selected-store.service';
import { ToastService } from '../../../shared/services/toast.service';
import { StoreStaffItem } from '../../interfaces/staff.interface';
import { StaffService } from '../../services/staff.service';
import { translateRoleName } from '../../../shared/i18n/roles.es';

@Component({
  selector: 'app-staff-list',
  standalone: true,
  imports: [PageHeaderComponent, SkeletonComponent, DataTableComponent],
  templateUrl: './staff-list.component.html',
  styleUrl: './staff-list.component.scss',
})
export class StaffListComponent {
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
  ];
  readonly rows = computed(() => this.members().map(member => ({
    id: member.id,
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
        return this.staffService.listStaff(this.page()).pipe(
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
