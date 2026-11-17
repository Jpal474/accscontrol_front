import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AuthService } from '../auth/services/auth.service';
import { productsGuard } from './products.guard';

describe('productsGuard', () => {
  let authenticated: boolean;
  let permissions: string[];
  let redirect: UrlTree;
  let createUrlTree: jasmine.Spy;
  beforeEach(() => {
    authenticated = true; permissions = ['view_products'];
    redirect = new UrlTree(); createUrlTree = jasmine.createSpy().and.returnValue(redirect);
    TestBed.configureTestingModule({ providers: [
      { provide: AuthService, useValue: { isAuthenticated: () => authenticated, hasPermission: (key: string) => permissions.includes(key) } },
      { provide: Router, useValue: { createUrlTree } },
    ] });
  });
  const check = (permission: string) => TestBed.runInInjectionContext(() => productsGuard(
    { data: { permission } } as unknown as ActivatedRouteSnapshot, {} as RouterStateSnapshot,
  ));

  it('requires authentication', () => { authenticated = false; expect(check('view_products')).toBe(redirect); expect(createUrlTree).toHaveBeenCalledWith(['/login']); });
  it('allows viewing while denying edits without manage_products', () => {
    expect(check('view_products')).toBe(true); expect(check('manage_products')).toBe(redirect); expect(createUrlTree).toHaveBeenCalledWith(['/app']);
  });
  it('allows editing with manage_products', () => { permissions = ['manage_products']; expect(check('manage_products')).toBe(true); });
});
