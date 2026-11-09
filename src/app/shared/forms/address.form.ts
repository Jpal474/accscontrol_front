import { FormControl, FormGroup, Validators } from '@angular/forms';
export function addressForm() {
  return new FormGroup({
    street: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(160)],
    }),
    externalNumber: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(50)],
    }),
    internalNumber: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(50)],
    }),
    neighborhood: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(160)],
    }),
    postalCode: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^\d{4,5}$/)],
    }),
    countryId: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    stateId: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    municipalityId: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    localityId: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });
}
export type AddressForm = ReturnType<typeof addressForm>;
