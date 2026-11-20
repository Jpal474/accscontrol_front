import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth/services/auth.service';

export const providersGuard: CanActivateFn = route => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated()) return router.createUrlTree(['/login']);
  const permission = route.data['permission'];
  return (typeof permission === 'string' && auth.hasPermission(permission)) || router.createUrlTree(['/app']);
};
