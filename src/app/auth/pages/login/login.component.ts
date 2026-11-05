import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { LoginCredentials } from '../../interfaces/login.interface';
import { RoutesService } from '../../../shared/services/routes.service';

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
  readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  public submit() {
    if (this.form.invalid || this.authSevice.busy()) {
      this.form.markAllAsTouched();
      return;
    }
    this.error.set('');

    const { email, password } = this.form.getRawValue();
    const credentials: LoginCredentials = {
      email: email.trim(),
      password: password,
    };

    // Nos suscribimos al Observable que retorna el servicio
    this.authSevice.login(credentials).subscribe({
      next: async () => {
        this.form.controls.password.reset();
        await this.routesService.redirectTo(
          this.routesService.routes.app.start,
        );
      },
      error: (err) => {
        // Aquí atrapas el error si el backend falla (ej: 401 Unauthorized)
        this.error.set('Credenciales inválidas o error en el servidor');
        console.error(err);
      },
    });
  }
}
