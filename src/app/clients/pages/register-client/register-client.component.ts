import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { EMPTY, catchError, combineLatest, finalize, switchMap, tap } from 'rxjs';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { SelectedStoreService } from '../../../shared/services/selected-store.service';
import { ToastService } from '../../../shared/services/toast.service';
import { AuthService } from '../../../auth/services/auth.service';
import { ClientsService } from '../../services/clients.service';

const CLIENT_NAME_PATTERN = /^\p{L}[\p{L}\p{M}]*(?:[ '\u2019-]\p{L}[\p{L}\p{M}]*)*$/u;

@Component({
  selector: 'app-register-client', standalone: true,
  imports: [ReactiveFormsModule, RouterLink, PageHeaderComponent, SkeletonComponent],
  templateUrl: './register-client.component.html', styleUrl: './register-client.component.scss',
})
export class RegisterClientComponent {
  private readonly service = inject(ClientsService);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  readonly selectedStore = inject(SelectedStoreService);
  readonly auth = inject(AuthService);
  readonly error = signal('');
  readonly busy = signal(false);
  readonly loading = signal(false);
  readonly loadFailed = signal(false);
  readonly clientId = signal<string | null>(null);
  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.pattern(CLIENT_NAME_PATTERN), Validators.maxLength(100)]],
    lastName: ['', [Validators.required, Validators.minLength(2), Validators.pattern(CLIENT_NAME_PATTERN), Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    phoneNumber: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
    isActive: [true],
  });
  constructor() {
    combineLatest([toObservable(this.selectedStore.selectedStoreId), this.route.paramMap]).pipe(
      switchMap(([storeId, params]) => {
        const id = params.get('clientId');
        this.clientId.set(id); this.clear(); this.loadFailed.set(false);
        if (!storeId || !id || !this.auth.hasPermission('manage_clients')) { this.loading.set(false); return EMPTY; }
        this.loading.set(true);
        return this.service.getById(id).pipe(
          tap(response => this.form.patchValue(response.data)),
          catchError(() => {
            this.loadFailed.set(true); this.error.set('No se pudo cargar el cliente en esta tienda. Regresa al listado e intenta nuevamente.');
            return EMPTY;
          }),
          finalize(() => this.loading.set(false)),
        );
      }), takeUntilDestroyed(this.destroyRef),
    ).subscribe();
  }
  clear() {
    this.form.reset({ name: '', lastName: '', email: '', phoneNumber: '', isActive: true });
    this.error.set('');
  }
  invalid(field: 'name' | 'lastName' | 'email' | 'phoneNumber') {
    const control = this.form.controls[field];
    return control.invalid && (control.touched || control.dirty);
  }
  submit() {
    if (this.busy() || this.loading() || this.loadFailed() || !this.auth.hasPermission('manage_clients')) return;
    const storeId = this.selectedStore.selectedStoreId();
    if (!storeId) { this.error.set('Selecciona una tienda para guardar el cliente.'); return; }
    const values = this.form.getRawValue();
    const normalizeName = (value: string) => value.normalize('NFC').trim().replace(/ +/g, ' ');
    const body = { ...values, name: normalizeName(values.name), lastName: normalizeName(values.lastName), email: values.email.trim().toLowerCase(), phoneNumber: values.phoneNumber.trim() };
    this.form.patchValue(body);
    if (this.form.invalid) { this.form.markAllAsTouched(); this.error.set('Revisa los campos señalados antes de guardar.'); return; }
    const id = this.clientId();
    this.busy.set(true); this.error.set('');
    const request = id ? this.service.update(id, body) : this.service.create(body);
    request.pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.busy.set(false))).subscribe({
      next: () => {
        this.toast.show(id ? 'Cliente actualizado correctamente.' : 'Cliente registrado correctamente.', 'success');
        if (storeId === this.selectedStore.selectedStoreId() && id === this.clientId()) void this.router.navigate(['/app/clients-list']);
      },
      error: err => {
        if (storeId !== this.selectedStore.selectedStoreId() || id !== this.clientId()) return;
        const message = err.error?.message || err.message;
        this.error.set(Array.isArray(message) ? message.join(' ') : message || 'No se pudo guardar el cliente. Intenta nuevamente.');
      },
    });
  }
}
