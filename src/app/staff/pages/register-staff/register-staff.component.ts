import { Component, inject, signal, viewChild, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { ToastService } from '../../../shared/services/toast.service';
import { StaffService } from '../../services/staff.service';
import {
  RegisterStaffInterface,
  StoreStaffItem,
} from '../../interfaces/staff.interface';
import { CatalogSelectComponent } from '../../../shared/components/catalog-select/catalog-select.component';
import { CatalogsService } from '../../../shared/services/catalogs.service';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-register-staff',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    PageHeaderComponent,
    SkeletonComponent,
    ConfirmDialogComponent,
    CatalogSelectComponent,
  ],
  templateUrl: './register-staff.component.html',
  styleUrl: './register-staff.component.scss',
})
export class RegisterStaffComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly staffService = inject(StaffService);
  private readonly toastService = inject(ToastService);
  private readonly catalogService = inject(CatalogsService);
  private readonly route = inject(ActivatedRoute);
  readonly loading = signal(false);
  readonly failed = signal(false);
  readonly busy = signal(false);
  readonly registered = signal(false);
  readonly memberId = signal<string | null>(null);
  readonly error = signal('');
  readonly dialog = viewChild.required(ConfirmDialogComponent);

  readonly form = this.fb.nonNullable.group({
    name: [
      '',
      [Validators.required, Validators.minLength(2), Validators.maxLength(100)],
    ],
    lastName: [
      '',
      [Validators.required, Validators.minLength(2), Validators.maxLength(200)],
    ],
    email: ['', [Validators.required, Validators.email]],
    roleId: ['', [Validators.required]],
  });

  readonly editing = signal<StoreStaffItem | null>(null);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('staffId');
    if (id) {
      this.memberId.set(id);
      this.loadStaffData(id);
    }
  }

  private loadStaffData(id: string) {
    this.busy.set(true);
    this.staffService.getStaffMemberById(id).subscribe({
      next: (response) => {
        this.startEditing(response.data);
        this.busy.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar los datos de la tienda.');
        this.busy.set(false);
      },
    });
  }
  readonly fetchRoles = (q: any) => this.catalogService.getRoles(q);

  startEditing(member: StoreStaffItem) {
    this.editing.set(member);

    this.form.patchValue({
      name: member.user.name,
      lastName: member.user.lastName,
      email: member.user.email,
      roleId: member.role.id,
    });
  }

  cancel() {
    this.editing.set(null);
    this.form.reset({
      name: '',
      lastName: '',
      email: '',
      roleId: '',
    });
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.busy.set(true);
    const formValues: RegisterStaffInterface = this.form.getRawValue();
    const isEditing = !!this.editing();

    const request$ = isEditing
      ? this.staffService.updateStaff(this.editing()!.id, formValues)
      : this.staffService.createStaff(formValues);

    request$.subscribe({
      next: () => {
        !isEditing ? this.registered.set(true) : this.registered.set(false);
        this.toastService.show(
          isEditing
            ? 'Asignación actualizada correctamente'
            : 'Personal registrado exitosamente',
          'success',
        );
        this.cancel();
      },
      error: (err) => {
        console.error('Error al procesar la solicitud de staff:', err);
        this.toastService.show(
          err.error?.message || 'Ocurrió un error inesperado.',
          'error',
        );
        this.busy.set(false);
      },
      complete: () => {
        this.busy.set(false);
      },
    });
  }
}
