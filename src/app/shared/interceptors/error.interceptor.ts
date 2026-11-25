// app/core/interceptors/error.interceptor.ts
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { AuthService } from '../../auth/services/auth.service';
import { ToastService } from '../services/toast.service';
import { environment } from '../../../environments/environment.development';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const toastService = inject(ToastService);
  const passwordChange = req.url.split('?')[0] === `${environment.apiUrl}auth/change-password`;
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 403 && error.error?.code === 'PASSWORD_CHANGE_REQUIRED') {
        const authorization = req.headers.get('Authorization');
        if (authorization === `Bearer ${authService.token()}` && authService.isAuthenticated()) {
          authService.requirePasswordChange();
          void router.navigateByUrl('/change-password', { replaceUrl: true });
        }
        return throwError(() => new Error(error.error.message));
      }

      const recovery = req.url.startsWith(`${environment.apiUrl}auth/`)
        && /\/(forgot-password|reset-password|recovery-email(?:\/confirm)?)$/.test(req.url);
      const assistedRecovery = req.url.startsWith(`${environment.apiUrl}auth/assisted-recovery/`);
      if ((passwordChange || recovery || assistedRecovery) && error.status !== 401) {
        const message = [400, 403, 409, 429].includes(error.status) ? error.error?.message : undefined;
        return throwError(() => new Error(
          (Array.isArray(message) ? message.join(' ') : message)
            || 'No se pudo cambiar tu contraseña. Inténtalo nuevamente.',
        ));
      }

      let errorMessage = 'Ocurrió un error inesperado';

      if (
        typeof ErrorEvent !== 'undefined' &&
        error.error instanceof ErrorEvent
      ) {
        // Error del lado del cliente o de red
        errorMessage = `Error: ${error.error.message}`;
      } else {
        // Error devuelto por el backend (NestJS)
        switch (error.status) {
          case 429:
            errorMessage = 'Demasiadas peticiones. Inténtalo más tarde.';
            break;
          case 401:
            if (req.url.split('?')[0] === `${environment.apiUrl}auth/signin`) {
              errorMessage = 'Correo o contraseña incorrectos.';
              break;
            }
            // Token expirado o inválido
            errorMessage =
              'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.';
            void authService.logout();
            break;

          case 403:
            errorMessage =
              'No tienes permisos suficientes para realizar esta acción.';
            router.navigate(['/403']); // Opcional: Redirigir a página prohibida
            break;

          case 404:
            errorMessage = 'El recurso solicitado no fue encontrado.';
            break;

          case 500:
            errorMessage = 'Error interno en el servidor. Inténtalo más tarde.';
            break;

          default:
            errorMessage =
              error.error?.message || `Código de error: ${error.status}`;
            break;
        }
      }

      toastService.show(errorMessage, 'error');
      console.error('[ErrorInterceptor]:', errorMessage, error);
      return throwError(() => new Error(errorMessage));
    }),
  );
};
