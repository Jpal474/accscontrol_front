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
      { provide: RoutesService, useValue: { routes: { public: { landing: '/' } }, redirectTo: jasmine.createSpy().and.resolveTo() } },
    ] });
    selectedStore = TestBed.inject(SelectedStoreService);
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    ['active_store_id', 'auth_token', 'user_permissions'].forEach(key => sessionStorage.removeItem(key));
  });

  it('selects the sole store when restoring a manager session', async () => {
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
    await service.logout();
    expect(selectedStore.selectedStoreId()).toBeNull();
    expect(sessionStorage.getItem('active_store_id')).toBeNull();
  });

  it('preserves a valid selection for a user with multiple stores', async () => {
    selectedStore.setSelectedStore('second-store');
    storage.getItem.and.resolveTo({ ...user, stores: [...user.stores, { storeId: 'second-store', role: 'manager' }] });
    service = TestBed.inject(AuthService);
    await Promise.resolve();
    expect(selectedStore.selectedStoreId()).toBe('second-store');
  });

  it('clears a selection outside the restored user stores', async () => {
    selectedStore.setSelectedStore('previous-store');
    storage.getItem.and.resolveTo({ ...user, stores: [] });
    service = TestBed.inject(AuthService);
    await Promise.resolve();
    expect(selectedStore.selectedStoreId()).toBeNull();
  });
});
