import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '../../auth/services/auth.service';
import { ToastService } from '../services/toast.service';
import { environment } from '../../../environments/environment.development';
import { errorInterceptor } from './error.interceptor';

describe('Authentication error redirection', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  let logout: jasmine.Spy;
  let navigate: jasmine.Spy;
  beforeEach(() => {
    logout = jasmine.createSpy().and.resolveTo();
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(withInterceptors([errorInterceptor])), provideHttpClientTesting(),
      { provide: AuthService, useValue: { logout } }, { provide: ToastService, useValue: { show: jasmine.createSpy() } },
    ] });
    http = TestBed.inject(HttpClient); controller = TestBed.inject(HttpTestingController);
    navigate = spyOn(TestBed.inject(Router), 'navigate'); spyOn(console, 'error');
  });
  afterEach(() => controller.verify());
  it('delegates protected 401 redirects only to logout', () => {
    http.get('/protected').subscribe({ error: () => {} });
    controller.expectOne('/protected').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(logout).toHaveBeenCalledTimes(1); expect(navigate).not.toHaveBeenCalled();
  });
  it('does not redirect or expire the session for rejected login credentials', () => {
    const url = `${environment.apiUrl}auth/signin`;
    http.post(url, {}).subscribe({ error: error => expect(error.message).toContain('incorrectos') });
    controller.expectOne(url).flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(logout).not.toHaveBeenCalled(); expect(navigate).not.toHaveBeenCalled();
  });
});
