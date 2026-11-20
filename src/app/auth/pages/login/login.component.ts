import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { LoginCredentials } from '../../interfaces/login.interface';
import { RoutesService } from '../../../shared/services/routes.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly routesService = inject(RoutesService);
  readonly error = signal('');
  readonly visible = signal(false);
  readonly authSevice = inject(AuthService);
  private readonly submitting = signal(false);
  readonly busy = computed(() => this.submitting() || this.authSevice.busy());
  readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  public async submit() {
    if (this.form.invalid || this.busy()) {
      this.form.markAllAsTouched();
      return;
    }
    this.error.set('');
    this.submitting.set(true);

    const { email, password } = this.form.getRawValue();
    const credentials: LoginCredentials = {
      email: email.trim(),
      password: password,
    };

    let authenticated = false;
    try {
      await firstValueFrom(this.authSevice.login(credentials));
      authenticated = true;
      this.form.controls.password.reset();
      const navigated = await this.routesService.redirectTo(this.routesService.routes.app.start);
      if (!navigated) this.error.set('La sesión inició, pero no se pudo abrir tu espacio. Inténtalo nuevamente.');
    } catch (err) {
      this.error.set(authenticated
        ? 'La sesión inició, pero no se pudo abrir tu espacio. Inténtalo nuevamente.'
        : 'Credenciales inválidas o error en el servidor');
      console.error(err);
    } finally {
      this.submitting.set(false);
    }
  }
}
