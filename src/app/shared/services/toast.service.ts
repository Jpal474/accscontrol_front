// app/core/services/toast.service.ts
import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
  id: number;
  text: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private counter = 0;
  readonly toasts = signal<ToastMessage[]>([]);

  show(
    text: string,
    type: 'success' | 'error' | 'info' | 'warning' = 'success',
    duration = 3500,
  ) {
    const id = ++this.counter;
    const newToast: ToastMessage = { id, text, type };

    // Añadimos el toast a la lista actual
    this.toasts.update((current) => [...current, newToast]);

    // Lo eliminamos automáticamente después del tiempo especificado
    setTimeout(() => {
      this.remove(id);
    }, duration);
  }

  remove(id: number) {
    this.toasts.update((current) => current.filter((t) => t.id !== id));
  }
}
