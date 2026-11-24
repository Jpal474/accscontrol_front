import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth/services/auth.service';

export const repairsGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated()) return router.createUrlTree(['/login']);
  return ['view_repairs', 'view_own_repairs', 'manage_repairs'].some(permission => auth.hasPermission(permission))
    || router.createUrlTree(['/app']);
};
