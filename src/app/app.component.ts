import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationSkipped, NavigationStart, Router, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ToastComponent } from './shared/components/toast/toast.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, ToastComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  title = 'accscontrol_front';
  private readonly router = inject(Router);
  private activeNavigationId = this.router.getCurrentNavigation()?.id ?? null;
  readonly navigating = signal(this.activeNavigationId !== null);

  constructor() {
    this.router.events.pipe(takeUntilDestroyed()).subscribe(event => {
      if (event instanceof NavigationStart) {
        this.activeNavigationId = event.id;
        this.navigating.set(true);
      } else if (event instanceof NavigationEnd || event instanceof NavigationCancel || event instanceof NavigationError || event instanceof NavigationSkipped) {
        if (event.id !== this.activeNavigationId) return;
        this.activeNavigationId = null;
        this.navigating.set(false);
      }
    });
  }
}
