import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth/services/auth.service';

export const inventoryGuard: CanActivateFn = () => {
  const auth = inject(AuthService), router = inject(Router);
  if (!auth.isAuthenticated()) return router.createUrlTree(['/login']);
  return auth.hasPermission('view_inventory') || router.createUrlTree(['/app']);
};
