import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { permissionsGuard } from './permissions.guard';
import { AuthService } from './services/auth.service';

@Component({ standalone: true, template: '' })
class TestPage {}

describe('permissionsGuard', () => {
  const authenticated = signal(true);
  const pending = signal(true);
  const platformAdmin = signal(false);
  const allowed = signal<string[]>(['view_own_repairs']);

  beforeEach(() => {
    authenticated.set(true);
    pending.set(true);
    platformAdmin.set(false);
    allowed.set(['view_own_repairs']);
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: {
          isAuthenticated: authenticated,
          isPlatformAdmin: platformAdmin,
          mustChangePassword: pending,
          permissions: allowed,
          hasPermission: (permission: string) => allowed().includes(permission),
        } },
        provideRouter([
          { path: '', component: TestPage, canActivate: [permissionsGuard], data: { public: true } },
          { path: 'login', component: TestPage, canActivate: [permissionsGuard], data: { public: true } },
          { path: 'change-password', component: TestPage, canActivate: [permissionsGuard], data: { passwordChange: true } },
          { path: 'app', canActivate: [permissionsGuard], canActivateChild: [permissionsGuard], children: [
            { path: '', pathMatch: 'full', component: TestPage },
            { path: 'repairs', component: TestPage, data: { permissions: ['view_repairs', 'view_own_repairs'] } },
            { path: 'reports', component: TestPage, data: { permissions: ['manage_store'] } },
            { path: 'compabilities-list', component: TestPage, data: { storeOperationsOnly: true } },
            { path: 'products-list', component: TestPage, data: { permissions: ['view_products'] } },
            { path: 'edit-product/:id', component: TestPage, data: { permissions: ['manage_products'] } },
            { path: 'repairs/:id', component: TestPage },
          ] },
        ]),
      ],
    });
  });

  it('redirects public and private URLs to the password form while the change is pending', async () => {
    const harness = await RouterTestingHarness.create('/app/repairs/123');
    expect(TestBed.inject(Router).url).toBe('/change-password');
    await harness.navigateByUrl('/login');
    expect(TestBed.inject(Router).url).toBe('/change-password');
  });

  it('takes an authenticated technician to repairs once the password is changed', async () => {
    pending.set(false);
    await RouterTestingHarness.create('/change-password');
    expect(TestBed.inject(Router).url).toBe('/app/repairs');
  });

  it('allows matching permissions and sends unauthorized feature routes to the dashboard', async () => {
    pending.set(false);
    const router = TestBed.inject(Router);
    const harness = await RouterTestingHarness.create('/app/repairs');
    expect(router.url).toBe('/app/repairs');
    await harness.navigateByUrl('/app/reports');
    expect(router.url).toBe('/app');
  });

  it('keeps compatibilities open to authenticated users and separates product viewing from editing', async () => {
    pending.set(false);
    allowed.set(['view_products']);
    const router = TestBed.inject(Router);
    const harness = await RouterTestingHarness.create('/app/compabilities-list');
    expect(router.url).toBe('/app/compabilities-list');
    await harness.navigateByUrl('/app/products-list');
    expect(router.url).toBe('/app/products-list');
    await harness.navigateByUrl('/app/edit-product/example');
    expect(router.url).toBe('/app');
    allowed.set(['manage_products']);
    await harness.navigateByUrl('/app/edit-product/example');
    expect(router.url).toBe('/app/edit-product/example');
  });

  it('blocks platform administrators from compatibility lookups', async () => {
    pending.set(false);
    platformAdmin.set(true);
    await RouterTestingHarness.create('/app/compabilities-list');
    expect(TestBed.inject(Router).url).toBe('/app');
  });

  it('sends an unauthenticated visitor to login', async () => {
    authenticated.set(false);
    await RouterTestingHarness.create('/change-password');
    expect(TestBed.inject(Router).url).toBe('/login');
  });
});
