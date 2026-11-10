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
  User,
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
  private readonly PERMISSIONS_KEY = 'user_permissions';

  private readonly _token = signal<string | null>(null);
  private readonly _currentUser = signal<any | null>(null);

  // ¡Los permisos se cargan de forma 100% síncrona al instante!
  private readonly _permissions = signal<string[]>(this.getStoredPermissions());

  readonly token = this._token.asReadonly();
  readonly currentUser = this._currentUser.asReadonly();
  readonly permissions = this._permissions.asReadonly();
  readonly isAuthenticated = computed(() => !!this._token());
  readonly busy = signal(false);

  constructor() {
    this.cargarSesionAlIniciar();
  }

  private cargarSesionAlIniciar() {
    if (!this.isBrowser) return;

    try {
      // 1. Token síncrono
      const storedToken = sessionStorage.getItem(this.TOKEN_KEY);
      if (storedToken) {
        this._token.set(storedToken);
      }

      // 2. Usuario cifrado (único que requiere asincronía)
      this.storageService.getItem<User>(this.USER_KEY).then((storedUser) => {
        if (storedUser) {
          this._currentUser.set(storedUser);
        }
      });
    } catch (error) {
      console.error('Error al cargar la sesión:', error);
      this.logout();
    }
  }

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
          const { access_token, user } = response.data;
          this.guardarSesion(access_token, user);
        }),
        finalize(() => {
          this.busy.set(false);
        }),
      );
  }

  private async guardarSesion(token: string, user: User) {
    const permissions = user.permissions || [];

    if (this.isBrowser) {
      // Guardado síncrono inmediato (sin esperas ni promesas para permisos y token)
      sessionStorage.setItem(this.TOKEN_KEY, token);
      sessionStorage.setItem(this.PERMISSIONS_KEY, JSON.stringify(permissions));

      // El usuario se queda cifrado en segundo plano si lo deseas
      await this.storageService.setItem(this.USER_KEY, user);
    }

    this._token.set(token);
    this._currentUser.set(user);
    this._permissions.set(permissions);
  }

  public async logout() {
    if (this.isBrowser) {
      sessionStorage.removeItem(this.TOKEN_KEY);
      sessionStorage.removeItem(this.PERMISSIONS_KEY);
      await this.storageService.removeItem(this.USER_KEY);
    }
    this._token.set(null);
    this._currentUser.set(null);
    this._permissions.set([]);

    await this.routesService.redirectTo(
      this.routesService.routes.public.landing,
    );
  }

  public hasPermission(permission: string): boolean {
    return this._permissions().includes(permission);
  }

  private getStoredPermissions(): string[] {
    try {
      if (!this.isBrowser) return [];
      const stored = sessionStorage.getItem(this.PERMISSIONS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('Error al leer permisos planos', e);
      return [];
    }
  }
}
