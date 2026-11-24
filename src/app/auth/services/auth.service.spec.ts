import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { StorageService } from '../../shared/services/storage.service';
import { RoutesService } from '../../shared/services/routes.service';
import { SelectedStoreService } from '../../shared/services/selected-store.service';
import { User } from '../interfaces/login.interface';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment.development';

import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let storage: jasmine.SpyObj<StorageService>;
  let selectedStore: SelectedStoreService;
  const user: User = {
    id: 'manager', email: 'manager@example.com', globalRole: null,
    stores: [{ storeId: 'only-store', role: 'manager' }], permissions: [],
  };

  beforeEach(() => {
    sessionStorage.removeItem('active_store_id');
    storage = jasmine.createSpyObj('StorageService', ['getItem', 'setItem', 'removeItem']);
    storage.getItem.and.resolveTo(null);
    storage.setItem.and.resolveTo();
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(), provideHttpClientTesting(),
      { provide: StorageService, useValue: storage },
      { provide: RoutesService, useValue: { routes: { public: { login: '/login' } }, redirectTo: jasmine.createSpy().and.resolveTo() } },
    ] });
    selectedStore = TestBed.inject(SelectedStoreService);
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    ['active_store_id', 'auth_token', 'user_permissions', 'must_change_password'].forEach(key => sessionStorage.removeItem(key));
  });

  it('selects the sole store when restoring a manager session', async () => {
    sessionStorage.setItem('auth_token', 'restored-token');
    selectedStore.setSelectedStore('previous-store');
    storage.getItem.and.resolveTo(user);
    service = TestBed.inject(AuthService);
    await Promise.resolve();
    expect(selectedStore.selectedStoreId()).toBe('only-store');
    expect(sessionStorage.getItem('active_store_id')).toBe('only-store');
  });

  it('selects the sole store before login completes and clears it on logout', async () => {
    service = TestBed.inject(AuthService);
    const login = firstValueFrom(service.login({ email: user.email, password: 'password' }));
    TestBed.inject(HttpTestingController).expectOne(`${environment.apiUrl}auth/signin`)
      .flush({ data: { access_token: 'token', user } });
    await login;
    expect(selectedStore.selectedStoreId()).toBe('only-store');
    const logout = service.logout();
    expect(service.isAuthenticated()).toBeFalse();
    expect(TestBed.inject(RoutesService).redirectTo).toHaveBeenCalledOnceWith('/login', true);
    await logout;
    expect(selectedStore.selectedStoreId()).toBeNull();
    expect(sessionStorage.getItem('active_store_id')).toBeNull();
  });

  it('preserves a valid selection for a user with multiple stores', async () => {
    sessionStorage.setItem('auth_token', 'restored-token');
    selectedStore.setSelectedStore('second-store');
    storage.getItem.and.resolveTo({ ...user, stores: [...user.stores, { storeId: 'second-store', role: 'manager' }] });
    service = TestBed.inject(AuthService);
    await Promise.resolve();
    expect(selectedStore.selectedStoreId()).toBe('second-store');
  });

  it('restores the required change immediately and stores the replacement session', async () => {
    sessionStorage.setItem('auth_token', 'restricted-token');
    sessionStorage.setItem('must_change_password', 'true');
    service = TestBed.inject(AuthService);
    expect(service.mustChangePassword()).toBeTrue();

    const change = firstValueFrom(service.changePassword({
      currentPassword: 'TempPass1!', newPassword: 'NewPass2@', confirmPassword: 'NewPass2@',
    }));
    TestBed.inject(HttpTestingController).expectOne(`${environment.apiUrl}auth/change-password`)
      .flush({ data: { access_token: 'replacement-token', user: { ...user, mustChangePassword: false } } });
    await change;
    expect(service.mustChangePassword()).toBeFalse();
    expect(service.token()).toBe('replacement-token');
    expect(sessionStorage.getItem('must_change_password')).toBeNull();
  });

  it('clears a selection outside the restored user stores', async () => {
    sessionStorage.setItem('auth_token', 'restored-token');
    selectedStore.setSelectedStore('previous-store');
    storage.getItem.and.resolveTo({ ...user, stores: [] });
    service = TestBed.inject(AuthService);
    await Promise.resolve();
    expect(selectedStore.selectedStoreId()).toBeNull();
  });
});
