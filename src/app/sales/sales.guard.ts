import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth/services/auth.service';

export const salesGuard: CanActivateFn = route => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated()) return router.createUrlTree(['/login']);
  const permissions: string[] = route.data['permissions'] ?? [];
  return permissions.some(permission => auth.hasPermission(permission)) || router.createUrlTree(['/app']);
};
