import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { AddressComponent } from '../../../shared/components/address/address.component';
import { addressForm } from '../../../shared/forms/address.form';
import { Router } from '@angular/router';

@Component({
  selector: 'app-register-store',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    PageHeaderComponent,
    SkeletonComponent,
    AddressComponent,
  ],
  templateUrl: './register-store.component.html',
  styleUrl: './register-store.component.scss',
})
export class RegisterStoreComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly company = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(160)]],
    phoneNumber: [
      '',
      [Validators.required, Validators.pattern(/^\+[1-9]\d{1,14}$/)],
    ],
    currency: ['MXN', Validators.required],
    email: ['mystore@gmail.com'],
    address: addressForm(),
  });
  readonly currencies = [
    'MXN',
    'USD',
    'EUR',
    'CAD',
    'COP',
    'ARS',
    'CLP',
    'PEN',
    'BRL',
    'GTQ',
  ];
}
