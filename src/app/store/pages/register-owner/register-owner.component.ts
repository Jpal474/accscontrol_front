import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-register-owner',
  standalone: true,
  imports: [ReactiveFormsModule, RouterModule, PageHeaderComponent],
  templateUrl: './register-owner.component.html',
  styleUrl: './register-owner.component.scss',
})
export class RegisterOwnerComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly owner = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(160)]],
    lastName: ['', [Validators.required, Validators.maxLength(160)]],
    lastName2: ['', [Validators.required, Validators.maxLength(160)]],
    email: ['mystore@gmail.com', Validators.email],
    phoneNumber: ['', Validators.pattern(/^\+[1-9]\d{1,14}$/)],
  });
}
