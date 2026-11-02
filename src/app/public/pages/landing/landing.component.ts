import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { faqData, features, problems } from './landing.data';
import { RouterLink } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
})
export class LandingComponent implements OnInit {
  readonly fb = inject(FormBuilder);
  readonly menuOpen = signal(false);
  readonly success = signal(false);
  readonly busy = signal(false);
  readonly successName = signal('');
  readonly successEmail = signal('');
  readonly faqOpen = signal(0);
  readonly error = signal('');
  readonly problems = problems;
  readonly features = features;
  readonly faqs = computed(() =>
    faqData.map((faq, index) => ({
      ...faq,
      open: this.faqOpen() === index,
      icon: this.faqOpen() === index ? 'remove' : 'add',
    })),
  );
  public form!: FormGroup;

  ngOnInit(): void {
    this.initForm();
  }
  private initForm(): void {
    this.form = this.fb.group({
      displayName: ['', [Validators.required, Validators.maxLength(160)]],
      email: [
        '',
        [Validators.required, Validators.email, Validators.maxLength(254)],
      ],
      companyName: ['', [Validators.required, Validators.maxLength(160)]],
      branches: [
        '',
        [Validators.required, Validators.pattern(/^(1|2-3|4-10|10\+)$/)],
      ],
      message: ['', Validators.maxLength(900)],
    });
  }

  toggleMenu(): void {
    this.menuOpen.update((value) => !value);
  }
  closeMenu(): void {
    this.menuOpen.set(false);
  }
  toggleFaq(index: number): void {
    this.faqOpen.update((current) => (current === index ? -1 : index));
  }
  fieldError(field: keyof typeof this.form.controls): string {
    const control = this.form.controls[field];
    if (!control.touched || !control.invalid) return '';
    return control.hasError('email')
      ? 'Escribe un correo válido.'
      : 'Completa este campo con un valor válido.';
  }
  resetForm(): void {
    this.success.set(false);
    this.error.set('');
    this.form.reset();
  }
}
