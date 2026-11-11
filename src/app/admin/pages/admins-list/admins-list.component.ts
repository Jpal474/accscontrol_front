import { Component, DestroyRef, computed, inject, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, debounceTime, distinctUntilChanged, finalize, of, startWith, switchMap } from 'rxjs';
import { AdminService } from '../../services/admin.service';
import { PlatformUser } from '../../interfaces/admin.interface';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-admins-list', standalone: true,
  imports: [ReactiveFormsModule, RouterLink, PageHeaderComponent, DataTableComponent, SkeletonComponent, ConfirmDialogComponent],
  templateUrl: './admins-list.component.html', styleUrl: './admins-list.component.scss',
})
export class AdminsListComponent {
  private readonly service = inject(AdminService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly reload = new Subject<void>();
  private filters = { email: '', search: '' };
  readonly form = inject(FormBuilder).nonNullable.group({ email: '', search: '' });
  readonly admins = signal<PlatformUser[]>([]);
  readonly loading = signal(false);
  readonly failed = signal(false);
  readonly busy = signal(false);
  readonly page = signal(1);
  readonly total = signal(0);
  readonly totalPages = signal(0);
  readonly pending = signal<{ admin: PlatformUser; isActive: boolean } | null>(null);
  readonly dialog = viewChild.required(ConfirmDialogComponent);
  readonly columns = [
    { key: 'name', label: 'Nombre' }, { key: 'lastName', label: 'Apellidos' },
    { key: 'email', label: 'Correo' }, { key: 'status', label: 'Estatus' },
  ];
  readonly actions = [{ key: 'activate', label: 'Activar' }, { key: 'deactivate', label: 'Desactivar' }];
  readonly rows = computed(() => this.admins().map(admin => ({
    ...admin, status: admin.isActive ? 'Activo' : 'Inactivo',
    activateDisabled: admin.isActive || this.busy(), deactivateDisabled: !admin.isActive || this.busy(),
  })));
  readonly confirmationMessage = computed(() => {
    const pending = this.pending();
    if (!pending) return '';
    return pending.isActive ? `Se activará el acceso de ${pending.admin.email}.`
      : `Se desactivará el acceso global de ${pending.admin.email}, incluidas sus sesiones abiertas.`;
  });

  constructor() {
    this.reload.pipe(startWith(undefined), switchMap(() => {
      this.loading.set(true); this.failed.set(false);
      return this.service.listAdmins({ page: this.page(), ...this.filters }).pipe(
        catchError(() => { this.failed.set(true); return of(null); }),
        finalize(() => this.loading.set(false)),
      );
    }), takeUntilDestroyed(this.destroyRef)).subscribe(response => {
      if (!response) return;
      this.admins.set(response.data);
      this.total.set(response.meta?.total ?? response.data.length);
      this.totalPages.set(response.meta?.totalPages ?? 1);
    });
    this.form.valueChanges.pipe(debounceTime(300),
      distinctUntilChanged((a, b) => a.email === b.email && a.search === b.search),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => {
      const value = this.form.getRawValue();
      this.filters = { email: value.email.trim(), search: value.search.trim() };
      this.load(1);
    });
  }
  load(page = this.page()) { this.page.set(page); this.reload.next(); }
  clearFilters() { this.form.reset(); }
  handleAction(event: { action: string; row: Record<string, any> }) {
    if (this.busy() || !['activate', 'deactivate'].includes(event.action)) return;
    const admin = this.admins().find(admin => admin.id === event.row['id']);
    const isActive = event.action === 'activate';
    if (!admin || admin.isActive === isActive) return;
    this.pending.set({ admin, isActive }); this.dialog().open();
  }
  changeStatus() {
    const pending = this.pending();
    if (!pending || this.busy()) return;
    this.busy.set(true);
    this.service.setAdminStatus(pending.admin.id, pending.isActive).pipe(
      takeUntilDestroyed(this.destroyRef), finalize(() => this.busy.set(false)),
    ).subscribe({
      next: response => {
        this.admins.update(admins => admins.map(admin => admin.id === pending.admin.id
          ? { ...admin, isActive: response.data.isActive } : admin));
        this.pending.set(null);
        this.toast.show('Estado del administrador actualizado.', 'success');
      },
      error: () => this.toast.show('No se pudo actualizar el estado del administrador.', 'error'),
    });
  }
}
