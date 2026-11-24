import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment.development';
import { ApiStandardResponse } from '../../../shared/interfaces/api-response.interface';
import { passwordRules, passwordValidators } from '../../password-policy';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './password-recovery.component.html',
  styleUrl: '../change-password/change-password.component.scss',
})
export class PasswordRecoveryComponent {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly base = `${environment.apiUrl}auth`;
  readonly mode: 'request' | 'reset' | 'settings' = this.route.snapshot.data['mode'];
  readonly token = this.route.snapshot.fragment;
  readonly rules = passwordRules;
  readonly busy = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly recoveryCode = signal('');
  private readonly forms = inject(FormBuilder).nonNullable;
  readonly request = this.forms.group({ email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]] });
  readonly settings = this.forms.group({ currentPassword: ['', Validators.required] });
  readonly reset = this.forms.group({
    newPassword: ['', passwordValidators],
    confirmPassword: ['', Validators.required],
    recoveryCode: ['', Validators.pattern(/^[a-fA-F0-9]{32}$/)],
  });

  requestLink() {
    if (this.request.invalid) {
      this.request.markAllAsTouched();
      return;
    }
    return this.run(async () => {
      await firstValueFrom(this.http.post(`${this.base}/forgot-password`, { email: this.request.controls.email.value.trim() }));
      this.message.set('Si existe una cuenta habilitada para este correo, recibirás un enlace para restablecer tu contraseña.');
    });
  }

  submitReset() {
    if (this.reset.invalid || this.reset.controls.newPassword.value !== this.reset.controls.confirmPassword.value) {
      this.reset.markAllAsTouched();
      return;
    }
    return this.run(async () => {
      const { recoveryCode, ...passwords } = this.reset.getRawValue();
      const { data } = await firstValueFrom(this.http.post<ApiStandardResponse<{ recoveryCodeUsed: boolean }>>(
        `${this.base}/reset-password`, {
        token: this.token, ...passwords, ...(recoveryCode ? { recoveryCode } : {}),
      }));
      this.reset.reset();
      this.message.set(data.recoveryCodeUsed
        ? 'Tu contraseña se actualizó. Inicia sesión y genera un nuevo código en Recuperación de cuenta.'
        : 'Tu contraseña se actualizó. Ya puedes iniciar sesión nuevamente.');
    });
  }

  sendVerification() {
    if (this.settings.invalid) {
      this.settings.markAllAsTouched();
      return;
    }
    return this.run(async () => {
      await firstValueFrom(this.http.post(`${this.base}/recovery-email`, this.settings.getRawValue()));
      this.settings.reset();
      this.message.set('Revisa tu correo y sigue el enlace para confirmar la dirección de recuperación.');
    });
  }

  confirmVerification() {
    return this.run(async () => {
      const { data } = await firstValueFrom(this.http.post<ApiStandardResponse<{ recoveryCode: string }>>(
        `${this.base}/recovery-email/confirm`, { token: this.token },
      ));
      this.recoveryCode.set(data.recoveryCode);
    });
  }

  private async run(action: () => Promise<void>) {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      await action();
    } catch (error) {
      this.error.set(error instanceof Error && error.message
        ? error.message : 'Ocurrió un error. Inténtalo nuevamente.');
    } finally {
      this.busy.set(false);
    }
  }
}
