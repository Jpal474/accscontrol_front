import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { authGuard } from './auth.guard';
import { AuthService } from './services/auth.service';

@Component({ standalone: true, template: '' })
class TestPage {}

describe('authGuard', () => {
  const authenticated = signal(true);
  const pending = signal(true);

  beforeEach(() => {
    authenticated.set(true);
    pending.set(true);
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: {
          isAuthenticated: authenticated,
          mustChangePassword: pending,
          permissions: () => ['view_own_repairs'],
        } },
        provideRouter([
          { path: '', component: TestPage, canActivate: [authGuard], data: { public: true } },
          { path: 'login', component: TestPage, canActivate: [authGuard], data: { public: true } },
          { path: 'change-password', component: TestPage, canActivate: [authGuard], data: { passwordChange: true } },
          { path: 'app', canActivate: [authGuard], canActivateChild: [authGuard], children: [
            { path: 'repairs', component: TestPage },
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

  it('sends an unauthenticated visitor to login', async () => {
    authenticated.set(false);
    await RouterTestingHarness.create('/change-password');
    expect(TestBed.inject(Router).url).toBe('/login');
  });
});
