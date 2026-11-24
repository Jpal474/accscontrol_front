import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { LoginComponent } from './login.component';
import { AuthService } from '../../services/auth.service';
import { RoutesService } from '../../../shared/services/routes.service';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let login: jasmine.Spy;
  let redirect: jasmine.Spy;
  beforeEach(async () => {
    login = jasmine.createSpy().and.returnValue(of({ data: { user: { permissions: [] } } }));
    redirect = jasmine.createSpy().and.resolveTo(true);
    await TestBed.configureTestingModule({ imports: [LoginComponent], providers: [provideRouter([]),
      { provide: AuthService, useValue: { busy: signal(false), login } },
      { provide: RoutesService, useValue: { routes: { public: { changePassword: '/change-password' }, app: { start: '/app' } }, redirectTo: redirect } },
    ] }).compileComponents();
    fixture = TestBed.createComponent(LoginComponent); component = fixture.componentInstance;
    component.form.setValue({ email: 'manager@example.com', password: 'password' }); fixture.detectChanges();
    spyOn(console, 'error');
  });
  it('keeps the loading label and blocks duplicate logins until navigation completes', async () => {
    let finishNavigation!: (value: boolean) => void;
    redirect.and.returnValue(new Promise<boolean>(resolve => finishNavigation = resolve));
    const pending = component.submit(); await Promise.resolve(); fixture.detectChanges();
    expect(redirect).toHaveBeenCalledOnceWith('/app', true); expect(component.busy()).toBeTrue();
    const button = fixture.nativeElement.querySelector('button.submit') as HTMLButtonElement;
    expect(button.disabled).toBeTrue(); expect(button.textContent).toContain('Entrando');
    // Even if valid credentials are entered again, the pending navigation blocks another request.
    component.form.controls.password.setValue('password'); await component.submit(); expect(login).toHaveBeenCalledTimes(1);
    finishNavigation(true); await pending; expect(component.busy()).toBeFalse();
  });
  it('releases the loading state after an authentication error without navigating', async () => {
    login.and.returnValue(throwError(() => new Error('Invalid credentials')));
    await component.submit(); expect(component.busy()).toBeFalse(); expect(component.error()).toBeTruthy();
    expect(redirect).not.toHaveBeenCalled();
  });
  it('handles failed and cancelled navigation without leaving the button stuck', async () => {
    redirect.and.rejectWith(new Error('Chunk load failed')); await component.submit();
    expect(component.busy()).toBeFalse(); expect(component.error()).toContain('no se pudo abrir');
    component.form.controls.password.setValue('password'); redirect.and.resolveTo(false); await component.submit();
    expect(component.busy()).toBeFalse(); expect(component.error()).toContain('no se pudo abrir');
  });
  it('routes an account with a pending password change to the required form', async () => {
    login.and.returnValue(of({ data: { user: { mustChangePassword: true, permissions: [] } } }));
    await component.submit();
    expect(redirect).toHaveBeenCalledOnceWith('/change-password', true);
  });
  it('does not authenticate an invalid form', async () => {
    component.form.controls.email.setValue('invalid'); await component.submit(); expect(login).not.toHaveBeenCalled();
  });
});
