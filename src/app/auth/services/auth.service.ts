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

  // Inicializamos las signals vacías (null) para evitar bloqueos síncronos
  private readonly _token = signal<string | null>(null);
  private readonly _currentUser = signal<any | null>(null);

  readonly token = this._token.asReadonly();
  readonly currentUser = this._currentUser.asReadonly();
  readonly isAuthenticated = computed(() => !!this._token());
  readonly busy = signal(false);

  constructor() {
    this.cargarSesionAlIniciar();
  }

  private cargarSesionAlIniciar() {
    if (!this.isBrowser) return;

    try {
      // 1. Leemos el token de manera 100% síncrona y directa del sessionStorage
      const storedToken = sessionStorage.getItem(this.TOKEN_KEY);
      if (storedToken) {
        this._token.set(storedToken);
      }

      // 2. El objeto usuario (que es más pesado o sensible) sí lo leemos con tu StorageService cifrado
      this.storageService.getItem(this.USER_KEY).then((storedUser) => {
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
          console.log('Token obtenido del login:', access_token);
          this.guardarSesion(access_token, user);
        }),
        finalize(() => {
          this.busy.set(false);
        }),
      );
  }

  private async guardarSesion(token: string, user: any) {
    if (this.isBrowser) {
      // Guardamos el token limpio y plano de forma síncrona
      sessionStorage.setItem(this.TOKEN_KEY, token);
      // Guardamos el usuario de forma cifrada con tu servicio
      await this.storageService.setItem(this.USER_KEY, user);
    }
    this._token.set(token);
    this._currentUser.set(user);
  }

  public async logout() {
    if (this.isBrowser) {
      sessionStorage.removeItem(this.TOKEN_KEY);
      await this.storageService.removeItem(this.USER_KEY);
    }
    this._token.set(null);
    this._currentUser.set(null);
    await this.routesService.redirectTo(
      this.routesService.routes.public.landing,
    );
  }
}
