// app/core/interceptors/error.interceptor.ts
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { AuthService } from '../../auth/services/auth.service';
import { ToastService } from '../services/toast.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const toastService = inject(ToastService);
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
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
          case 401:
            // Token expirado o inválido
            errorMessage =
              'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.';
            authService.logout(); // Limpiamos la sesión local
            router.navigate(['/login']); // Redirigimos al login
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
