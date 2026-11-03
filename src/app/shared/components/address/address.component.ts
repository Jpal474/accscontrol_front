import { Component, inject, input, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { AddressForm } from '../../forms/address.form';

@Component({
  selector: 'app-address',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './address.component.html',
  styleUrl: './address.component.scss',
})
export class AddressComponent {
  readonly prefix = input.required<string>();
  readonly title = input('Dirección');
  readonly form = input.required<AddressForm>();
}
