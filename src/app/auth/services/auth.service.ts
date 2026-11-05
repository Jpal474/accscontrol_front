import { HttpClient } from '@angular/common/http';
import {
  inject,
  Injectable,
  signal,
  computed,
  PLATFORM_ID,
} from '@angular/core';
import { environment } from '../../../environments/environment.development';
import {
  LoginCredentials,
  LoginApiResponse,
} from '../interfaces/login.interface';
import { Observable, finalize, tap } from 'rxjs';
import { ApiStandardResponse } from '../../shared/interfaces/api-response.interface';
import { isPlatformBrowser } from '@angular/common';
import { RoutesService } from '../../shared/services/routes.service';
import { StorageService } from '../../shared/services/storage.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly routesService = inject(RoutesService);
  private readonly base = `${environment.apiUrl}auth`;
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly storageService = inject(StorageService);
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'auth_user';
  private readonly _token = signal<string | null>(
    this.isBrowser ? sessionStorage.getItem(this.TOKEN_KEY) : null,
  );
  private readonly _currentUser = signal<any | null>(
    this.isBrowser ? this.getStoredUser() : null,
  );
  readonly token = this._token.asReadonly();
  readonly currentUser = this._currentUser.asReadonly();
  readonly isAuthenticated = computed(() => !!this._token());
  readonly busy = signal(false);

  public login(
    loginCredentials: LoginCredentials,
  ): Observable<ApiStandardResponse<LoginApiResponse>> {
    this.busy.set(true);

    return this.http
      .post<
        ApiStandardResponse<LoginApiResponse>
      >(`${this.base}/signin`, loginCredentials)
      .pipe(
        tap((response) => {
          // window.alert('alert');
          const { access_token, user } = response.data;
          this.guardarSesion(access_token, user);
        }),
        finalize(() => {
          this.busy.set(false);
        }),
      );
  }

  private async guardarSesion(token: string, user: any) {
    await this.storageService.setItem(this.TOKEN_KEY, token);
    await this.storageService.setItem(this.USER_KEY, user);
    this._token.set(token);
    this._currentUser.set(user);
  }

  public async logout() {
    if (this.isBrowser) {
      sessionStorage.removeItem(this.TOKEN_KEY);
      sessionStorage.removeItem(this.USER_KEY);
    }
    this._token.set(null);
    this._currentUser.set(null);
    await this.routesService.redirectTo(
      this.routesService.routes.public.landing,
    );
  }

  private getStoredUser() {
    const user = sessionStorage.getItem(this.USER_KEY);
    return user ? JSON.parse(user) : null;
  }
}
