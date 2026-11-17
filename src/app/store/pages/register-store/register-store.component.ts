import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CatalogRequest } from '../../../shared/interfaces/catalogs.interface';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { AddressComponent } from '../../../shared/components/address/address.component';
import { addressForm } from '../../../shared/forms/address.form';
import { StoreService } from '../../services/store.service';
import { CatalogSelectComponent } from '../../../shared/components/catalog-select/catalog-select.component';
import { CatalogsService } from '../../../shared/services/catalogs.service';
import { ToastService } from '../../../shared/services/toast.service';
import { RoutesService } from '../../../shared/services/routes.service';

@Component({
  selector: 'app-register-store',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    PageHeaderComponent,
    SkeletonComponent,
    AddressComponent,
    CatalogSelectComponent,
  ],
  templateUrl: './register-store.component.html',
  styleUrl: './register-store.component.scss',
})
export class RegisterStoreComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly storeService = inject(StoreService);
  private readonly catalogsService = inject(CatalogsService);
  private readonly toastService = inject(ToastService);
  private readonly routesService = inject(RoutesService);
  readonly registered = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly storeId = signal<string | null>(null);
  readonly hasShareableCatalogs = signal(false);
  readonly checkingCatalogs = signal(false);
  readonly catalogCheckFailed = signal(false);

  readonly company = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(160)]],
    phoneNumber: [
      '',
      [Validators.required, Validators.pattern(/^\+[1-9]\d{1,14}$/)],
    ],
    currency: ['MXN', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    catalogMode: ['own'],
    productCatalogId: [''],
    address: addressForm(),
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('storeId');
    if (id) {
      this.storeId.set(id);
      this.loadStoreData(id);
    } else {
      this.checkCatalogs();
    }
    this.company.controls.catalogMode.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(mode => {
      const control = this.company.controls.productCatalogId;
      control.reset();
      control.setValidators(mode === 'shared' ? Validators.required : null);
      control.updateValueAndValidity();
    });
  }

  readonly fetchProductCatalogs = (query: CatalogRequest) => this.storeService.getOwnerProductCatalogs(query);

  checkCatalogs() {
    this.checkingCatalogs.set(true); this.catalogCheckFailed.set(false);
    this.storeService.getOwnerProductCatalogs({ page: 1, pageSize: 1 }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: response => { this.hasShareableCatalogs.set((response.meta?.total ?? response.data.length) > 0); this.checkingCatalogs.set(false); },
      error: () => { this.catalogCheckFailed.set(true); this.checkingCatalogs.set(false); },
    });
  }

  registerAnother() {
    this.company.reset({ currency: 'MXN', catalogMode: 'own', productCatalogId: '' });
    this.registered.set(false); this.checkCatalogs();
  }

  readonly fetchCurrencies = (q: any) => this.catalogsService.getCurrencies(q);

  private loadStoreData(id: string) {
    this.busy.set(true);
    this.storeService.getStoreById(id).subscribe({
      next: (store) => {
        this.company.patchValue({
          name: store.data.name,
          phoneNumber: store.data.phoneNumber,
          currency: store.data.currencyId,
          email: store.data.email,
          address: {
            street: store.data.address?.street,
            externalNumber: store.data.address?.externalNumber,
            internalNumber: store.data.address?.internalNumber,
            neighborhood: store.data.address?.neighborhood,
            postalCode: store.data.address?.postalCode,
            countryId: store.data.address?.countryId,
            stateId: store.data.address?.stateId,
            municipalityId: store.data.address?.municipalityId,
            localityId: store.data.address?.localityId,
          },
        });
        this.busy.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar los datos de la tienda.');
        this.busy.set(false);
      },
    });
  }

  onSubmit() {
    if (this.busy() || this.checkingCatalogs()) return;
    if (this.company.invalid) {
      this.company.markAllAsTouched();
      return;
    }

    this.busy.set(true);
    this.error.set('');

    const rawValues = this.company.getRawValue();

    const storePayload = {
      name: rawValues.name,
      phoneNumber: rawValues.phoneNumber,
      email: rawValues.email,
      currencyId: rawValues.currency,
      street: rawValues.address.street,
      externalNumber: rawValues.address.externalNumber,
      internalNumber: rawValues.address.internalNumber,
      neighborhood: rawValues.address.neighborhood,
      postalCode: rawValues.address.postalCode,
      localityId: rawValues.address.localityId,
      ...(!this.storeId() && rawValues.catalogMode === 'shared' ? { productCatalogId: rawValues.productCatalogId } : {}),
    };

    const currentId = this.storeId();

    const request$ = currentId
      ? this.storeService.updateStore(currentId, storePayload)
      : this.storeService.createStore(storePayload);

    request$.subscribe({
      next: () => {
        let message = '';
        if (!currentId) {
          this.registered.set(true);
          message = 'registrada';
        } else {
          message = 'actualizada';
        }
        this.toastService.show(message, 'success');
      },
      error: (err) => {
        this.toastService.show('Ocurrió un error al guardar', 'error');
        this.error.set(err.error?.message || 'Ocurrió un error al guardar.');
        this.busy.set(false);
      },
      complete: () => this.busy.set(false),
    });
  }
}
