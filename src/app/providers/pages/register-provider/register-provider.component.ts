import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { EMPTY, catchError, combineLatest, finalize, switchMap, tap } from 'rxjs';
import { AuthService } from '../../../auth/services/auth.service';
import { AddressComponent, AddressOptions } from '../../../shared/components/address/address.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { addressForm } from '../../../shared/forms/address.form';
import { SelectedStoreService } from '../../../shared/services/selected-store.service';
import { SaveProvider } from '../../interfaces/provider.interface';
import { ProvidersService } from '../../services/providers.service';

const RFC_PATTERN = /^[A-Z\u00D1&]{3,4}\d{2}(?:(?:0[13578]|1[02])(?:0[1-9]|[12]\d|3[01])|(?:0[469]|11)(?:0[1-9]|[12]\d|30)|02(?:0[1-9]|[12]\d))[A-Z0-9]{3}$/i;
const PHONE_PATTERN = /^(?:(?=(?:\D*\d){7,15}\D*$)\+?[\d() -]+)?$/;
const NAME_PATTERN = /^[A-Za-zÁÉÍÓÚÜáéíóúüÑñ]+(?:[\s'-][A-Za-zÁÉÍÓÚÜáéíóúüÑñ]+)+$/
@Component({
  selector: 'app-register-provider',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, AddressComponent, PageHeaderComponent, SkeletonComponent],
  templateUrl: './register-provider.component.html',
  styleUrl: './register-provider.component.scss',
})
export class RegisterProviderComponent {
  private readonly providers = inject(ProvidersService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  readonly auth = inject(AuthService);
  readonly store = inject(SelectedStoreService);
  readonly providerId = signal<string | null>(this.route.snapshot.paramMap.get('providerId'));
  readonly loading = signal(false);
  readonly loadFailed = signal(false);
  readonly busy = signal(false);
  readonly saved = signal(false);
  readonly error = signal('');
  readonly addressOptions = signal<AddressOptions>({});
  readonly form = inject(FormBuilder).nonNullable.group({
    commercialName: ['', [Validators.required, Validators.maxLength(150)]],
    fiscalName: ['', Validators.maxLength(150)],
    phoneNumber: ['', [Validators.required, Validators.maxLength(20), Validators.pattern(PHONE_PATTERN)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    rfc: ['', [Validators.pattern(RFC_PATTERN), Validators.required]],
    contactName: ['', [Validators.maxLength(100), Validators.pattern(NAME_PATTERN)]],
    contactPhone: ['', [Validators.maxLength(20), Validators.pattern(PHONE_PATTERN)]],
    contactEmail: ['', [Validators.email, Validators.maxLength(254)]],
    notes: '',
    isActive: true,
    address: addressForm(),
  });

  constructor() {
    const address = this.form.controls.address;
    const levels = ['countryId', 'stateId', 'municipalityId', 'localityId'] as const;
    levels.slice(0, -1).forEach((key, index) => {
      address.controls[key].valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => levels.slice(index + 1).forEach(child => address.controls[child].reset('', { emitEvent: false })));
    });
    combineLatest([toObservable(this.store.selectedStoreId), this.route.paramMap]).pipe(
      switchMap(([storeId, params]) => {
        const id = params.get('providerId');
        this.providerId.set(id);
        this.reset();
        this.loadFailed.set(false);
        if (!storeId || !id) return EMPTY;
        this.loading.set(true);
        return this.providers.get(id).pipe(
          tap(({ data }) => {
            const address = data.address;
            const locality = address?.locality;
            const municipality = locality?.municipality;
            const state = municipality?.state;
            const option = (place?: { id: string; name: string } | null) => place
              ? { id: place.id, value: place.name } : undefined;
            this.addressOptions.set({
              country: option(state?.country),
              state: option(state),
              municipality: option(municipality),
              locality: option(locality),
            });
            this.form.patchValue({
              ...data,
              contactEmail: data.contactEmail ?? '',
              address: {
                street: address?.street ?? '',
                externalNumber: address?.externalNumber ?? '',
                internalNumber: address?.internalNumber ?? '',
                neighborhood: address?.neighborhood ?? '',
                postalCode: address?.postalCode ?? '',
                localityId: address?.localityId ?? locality?.id ?? '',
                municipalityId: municipality?.id ?? '',
                stateId: state?.id ?? '',
                countryId: state?.country?.id ?? '',
              },
            }, { emitEvent: false });
          }),
          catchError(() => {
            this.loadFailed.set(true);
            this.error.set('No se pudo cargar el proveedor en esta tienda.');
            return EMPTY;
          }),
          finalize(() => this.loading.set(false)),
        );
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe();
  }

  reset() {
    this.form.reset(undefined, { emitEvent: false });
    this.error.set('');
    this.saved.set(false);
    this.addressOptions.set({});
  }

  invalid(field: 'rfc' | 'phoneNumber' | 'contactName' | 'contactPhone' | 'email' | 'contactEmail', error?: string) {
    const control = this.form.controls[field];
    return control.touched && (error ? control.hasError(error) : control.invalid);
  }

  submit() {
    const storeId = this.store.selectedStoreId();
    if (!storeId || this.busy() || this.loading() || this.loadFailed() || this.saved()
        || !this.auth.hasPermission('manage_providers')) return;

    const { address, ...fields } = this.form.getRawValue();
    const normalized = {
      commercialName: fields.commercialName.trim(),
      fiscalName: fields.fiscalName.trim(),
      phoneNumber: fields.phoneNumber.trim(),
      email: fields.email.trim().toLowerCase(),
      rfc: fields.rfc.trim().toUpperCase(),
      contactName: fields.contactName.trim(),
      contactPhone: fields.contactPhone.trim(),
      contactEmail: fields.contactEmail.trim().toLowerCase(),
      notes: fields.notes.trim(),
      isActive: fields.isActive,
    };
    const location = {
      street: address.street.trim(),
      externalNumber: address.externalNumber.trim(),
      internalNumber: address.internalNumber.trim(),
      neighborhood: address.neighborhood.trim(),
      postalCode: address.postalCode.trim(),
      localityId: address.localityId,
    };
    this.form.patchValue({ ...normalized, address: location });
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Revisa los datos del proveedor y la dirección.');
      return;
    }

    const id = this.providerId();
    const body: SaveProvider = { ...normalized, ...location, contactEmail: normalized.contactEmail || null };
    this.busy.set(true);
    this.error.set('');
    const request = id ? this.providers.update(id, body) : this.providers.create(body);
    request.pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.busy.set(false))).subscribe({
      next: () => {
        if (storeId === this.store.selectedStoreId() && id === this.providerId()) this.saved.set(true);
      },
      error: error => {
        if (storeId === this.store.selectedStoreId() && id === this.providerId()) {
          this.error.set(error.message || 'No se pudo guardar el proveedor.');
        }
      },
    });
  }
}
