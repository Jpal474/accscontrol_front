import { Component, ElementRef, inject } from '@angular/core';

@Component({
  selector: 'input[appInput]',
  standalone: true,
  template: '',
  styles: [`
    :host:not([type='checkbox']):not([type='radio']):not([type='hidden']):not([type='range']):not([type='color']) {
      border-inline-start: 3px solid var(--input-accent, var(--accent));
    }
    :host([aria-invalid='true']) { --input-accent: var(--danger); }
  `],
})
export class InputComponent {
  private readonly element = inject<ElementRef<HTMLInputElement>>(ElementRef);

  get value(): string {
    return this.element.nativeElement.value;
  }
}
