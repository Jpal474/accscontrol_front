import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { RoutesService } from '../../../shared/services/routes.service';
import { passwordRules, passwordValidators } from '../../password-policy';
import { AuthService } from '../../services/auth.service';

@Component({
  standalone: true,
  selector: 'app-change-password',
  imports: [ReactiveFormsModule],
  templateUrl: './change-password.component.html',
  styleUrl: './change-password.component.scss',
})
export class ChangePasswordComponent {
  private readonly auth = inject(AuthService);
  private readonly navigation = inject(RoutesService);
  readonly rules = passwordRules;
  readonly submitting = signal(false);
  readonly error = signal('');
  readonly destination = signal('');
  readonly form = inject(FormBuilder).nonNullable.group(
    {
      currentPassword: ['', Validators.required],
      newPassword: ['', passwordValidators],
      confirmPassword: ['', Validators.required],
    },
    { validators: (group) => {
      const current = group.get('currentPassword')?.value;
      const next = group.get('newPassword')?.value;
      const confirmation = group.get('confirmPassword')?.value;
      const errors = {
        reused: !!next && current === next,
        mismatch: !!confirmation && next !== confirmation,
      };
      return errors.reused || errors.mismatch ? errors : null;
    } },
  );

  async submit(): Promise<void> {
    if (this.submitting()) return;
    this.error.set('');
    if (!this.destination() && this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    try {
      if (!this.destination()) {
        const { data } = await firstValueFrom(this.auth.changePassword(this.form.getRawValue()));
        this.destination.set(this.navigation.homeFor(data.user.permissions));
        this.form.reset();
      }
      if (!(await this.navigation.redirectTo(this.destination(), true))) {
        this.error.set('Tu contraseña se actualizó. Intenta abrir tu espacio nuevamente.');
      }
    } catch (error) {
      this.error.set(this.destination()
        ? 'Tu contraseña se actualizó. Intenta abrir tu espacio nuevamente.'
        : error instanceof Error && error.message
          ? error.message
          : 'No se pudo cambiar tu contraseña. Inténtalo nuevamente.');
    } finally {
      this.submitting.set(false);
    }
  }
}
