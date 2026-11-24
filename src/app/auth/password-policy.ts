import { AbstractControl, Validators } from '@angular/forms';

export const passwordRules =
  'Usa al menos 8 caracteres, una mayúscula, un número y un símbolo especial (por ejemplo, !, @ o #).';

export const passwordValidators = [
  Validators.required,
  ({ value }: AbstractControl<string>) => Array.from(value).length >= 8 &&
    /\p{Lu}/u.test(value) && /\d/.test(value) && /[\p{P}\p{S}]/u.test(value)
    ? null : { strength: true },
  ({ value }: AbstractControl<string>) => new TextEncoder().encode(value).length > 72
    ? { tooLong: true } : null,
];
