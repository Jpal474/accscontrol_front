import { Component, inject, signal } from '@angular/core';
import {
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Client } from '../../interfaces/client.interface';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-register-client',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, PageHeaderComponent],
  templateUrl: './register-client.component.html',
  styleUrl: './register-client.component.scss',
})
export class RegisterClientComponent {
  private readonly fb = inject(FormBuilder);
  readonly error = signal('');
  readonly busy = signal(false);
  editing: Client | null = null;
  private pending: Record<string, unknown> | null = null;
  readonly form = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.maxLength(40)]],
    name: ['', [Validators.required, Validators.maxLength(160)]],
    email: [''],
    phone: [''],
    notes: [''],
    active: [true],
    reason: ['', [Validators.required, Validators.maxLength(500)]],
  });

  clear() {
    if (this.pending) return;
    this.editing = null;
    this.form.reset({ active: true });
  }
}
