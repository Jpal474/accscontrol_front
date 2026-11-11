import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AdminService } from '../../services/admin.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-register-admin', standalone: true,
  imports: [ReactiveFormsModule, RouterLink, PageHeaderComponent],
  templateUrl: './register-admin.component.html', styleUrl: './register-admin.component.scss',
})
export class RegisterAdminComponent {
  private readonly service = inject(AdminService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
  });
  submit() {
    if (this.busy()) return;
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.busy.set(true);
    this.error.set('');
    this.service.createAdmin(this.form.getRawValue()).pipe(
      takeUntilDestroyed(this.destroyRef), finalize(() => this.busy.set(false)),
    ).subscribe({
      next: response => {
        this.form.reset();
        this.toast.show(response.data.emailSent
          ? 'Administrador registrado. Se enviaron sus credenciales por correo.'
          : 'Administrador registrado, pero no se pudo enviar el correo de acceso.',
          response.data.emailSent ? 'success' : 'warning');
      },
      error: () => this.error.set('No se pudo registrar el administrador. Verifica los datos y que el correo no esté registrado.'),
    });
  }
}
