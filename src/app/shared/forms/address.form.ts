import { FormControl, FormGroup, Validators } from '@angular/forms';
export function addressForm() {
  return new FormGroup({
    line1: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(160)],
    }),
    line2: new FormControl('', {
      nonNullable: true,
      validators: Validators.maxLength(160),
    }),
    locality: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    city: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    state: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    postalCode: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(16)],
    }),
    country: new FormControl('MX', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });
}
export type AddressForm = ReturnType<typeof addressForm>;
