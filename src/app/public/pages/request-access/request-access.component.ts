import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PublicService } from '../../services/public.service';
import { firstValueFrom } from 'rxjs';
import { RoutesService } from '../../../shared/services/routes.service';

@Component({
  selector: 'app-request-access',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './request-access.component.html',
  styleUrl: './request-access.component.scss',
})
export class RequestAccessComponent {
  private readonly fb = inject(FormBuilder);
  private readonly publicService = inject(PublicService);
  private readonly routesService = inject(RoutesService);

  readonly theme = {
    dark: signal(false),
    toggle() {
      this.dark.update((v) => !v);
    },
  };

  readonly busy = signal(false);
  readonly success = signal(false);
  readonly error = signal('');

  readonly form = this.fb.nonNullable.group({
    displayName: ['', [Validators.required, Validators.maxLength(160)]],
    email: [
      '',
      [Validators.required, Validators.email, Validators.maxLength(254)],
    ],
    companyName: ['', [Validators.required, Validators.maxLength(160)]],
    branches: ['', Validators.required],
    message: ['', Validators.maxLength(900)],
  });

  async submit(): Promise<void> {
    if (this.busy()) return;

    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    this.busy.set(true);
    this.error.set('');
    this.success.set(false);

    try {
      const payload = this.form.getRawValue();
      await firstValueFrom(this.publicService.sendAccessRequestMail(payload));
      this.success.set(true);
      this.form.reset();
    } catch (err: any) {
      console.error('Error al enviar la solicitud de acceso:', err);
      const errorMessage =
        err.error?.message ||
        'No se pudo enviar la solicitud. Inténtalo más tarde.';
      this.error.set(errorMessage);
    } finally {
      this.busy.set(false);
    }
  }

  public redirectToLogin(): void {
    this.routesService.redirectTo(this.routesService.routes.public.login);
  }
}
