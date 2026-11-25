import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AssistedRecoveryPreview, AssistedRecoveryService } from '../../services/assisted-recovery.service';

@Component({
  selector: 'app-assisted-recovery-dialog',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './assisted-recovery-dialog.component.html',
  styleUrl: './assisted-recovery-dialog.component.scss',
})
export class AssistedRecoveryDialogComponent {
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly service = inject(AssistedRecoveryService);
  private selection?: { userId: string; storeId?: string };

  readonly preview = signal<AssistedRecoveryPreview | null>(null);
  readonly loading = signal(false);
  readonly sending = signal(false);
  readonly sent = signal(false);
  readonly error = signal('');
  readonly form = inject(FormBuilder).nonNullable.group({
    currentPassword: ['', [Validators.required, Validators.maxLength(256)]],
    verified: [false, Validators.requiredTrue],
  });

  async open(userId: string, storeId?: string) {
    const dialog = this.dialog().nativeElement;
    if (dialog.open) return;
    const selection = { userId, storeId };
    this.selection = selection;
    this.form.reset();
    this.preview.set(null);
    this.error.set('');
    this.sent.set(false);
    this.loading.set(true);
    dialog.showModal();
    try {
      const { data } = await firstValueFrom(this.service.preview(userId, storeId));
      if (this.selection === selection) this.preview.set(data);
    } catch (error) {
      if (this.selection === selection) this.setError(error);
    } finally {
      if (this.selection === selection) this.loading.set(false);
    }
  }

  async send() {
    const selection = this.selection;
    if (!selection || !this.preview() || this.sending() || this.sent()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.sending.set(true);
    this.error.set('');
    try {
      await firstValueFrom(this.service.send(selection.userId, this.form.controls.currentPassword.value, selection.storeId));
      this.form.reset();
      this.sent.set(true);
    } catch (error) {
      this.setError(error);
    } finally {
      this.sending.set(false);
    }
  }

  close() {
    if (!this.sending()) this.dialog().nativeElement.close();
  }

  onCancel(event: Event) {
    if (this.sending()) event.preventDefault();
  }

  onClose() {
    this.selection = undefined;
    this.form.reset();
  }

  private setError(error: unknown) {
    this.error.set(error instanceof Error ? error.message : 'No se pudo recuperar el acceso. Inténtalo nuevamente.');
  }
}
