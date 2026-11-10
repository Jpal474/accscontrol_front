import {
  Component,
  ElementRef,
  HostListener,
  Inject,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrandComponent } from '../../../shared/components/brand/brand.component';
import { AuthService } from '../../../auth/services/auth.service';
import { CatalogSelectComponent } from '../../../shared/components/catalog-select/catalog-select.component';
import { StoreService } from '../../../store/services/store.service';
import { SelectedStoreService } from '../../../shared/services/selected-store.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    ConfirmDialogComponent,
    RouterOutlet,
    FormsModule,
    RouterLink,
    RouterLinkActive,
    BrandComponent,
    CatalogSelectComponent,
    ReactiveFormsModule,
  ],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent implements OnInit {
  readonly open = signal(false);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly confirmation = viewChild.required(ConfirmDialogComponent);
  readonly authSevice = inject(AuthService);
  readonly storesSevice = inject(StoreService);
  readonly selectedStoreService = inject(SelectedStoreService);
  readonly storeControl = new FormControl<string | null>(
    this.selectedStoreService.selectedStoreId(),
  );
  @HostListener('document:keydown.escape', ['$event'])
  escapeMenu(event: Event) {
    if (this.open()) {
      event.preventDefault();
      this.closeMenu();
    }
  }
  @HostListener('window:resize')
  onResize() {
    if (window.innerWidth >= 1024) this.open.set(false);
  }

  readonly fetchStores = (q: any) => this.storesSevice.getStoresCatalog(q);
  ngOnInit() {
    this.storeControl.valueChanges.subscribe((storeId) => {
      this.selectedStoreService.setSelectedStore(storeId);
      console.log('Tienda activa cambiada:', storeId);

      // Opcional: Puedes forzar un recargar o notificar si estás en la misma ruta
    });
  }

  toggleMenu() {
    if (this.open()) {
      this.closeMenu();
      return;
    }
    this.open.set(true);
    setTimeout(
      () =>
        this.open() &&
        this.element.nativeElement
          .querySelector<HTMLButtonElement>('.mobile-close')
          ?.focus(),
    );
  }
  menuKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeMenu();
      return;
    }
    if (event.key !== 'Tab' || !this.open()) return;
    const nodes = Array.from(
      this.element.nativeElement.querySelectorAll<HTMLElement>(
        '.sidebar button, .sidebar a',
      ),
    );
    const first = nodes[0],
      last = nodes[nodes.length - 1];
    if (event.shiftKey && event.target === first) {
      event.preventDefault();
      last?.focus();
    }
    if (!event.shiftKey && event.target === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  async logout() {
    this.authSevice.logout();
    // try {
    //   await this.auth.logout();
    // } catch {
    //   this.notices.show(
    //     'Sesión local cerrada. No se pudo confirmar la revocación; vuelve a intentarlo al recuperar conexión.',
    //     'error',
    //   );
    // } finally {
    //   await this.router.navigateByUrl('/login', { replaceUrl: true });
    // }
  }

  closeMenu() {
    this.open.set(false);
    setTimeout(() =>
      this.element.nativeElement
        .querySelector<HTMLButtonElement>('.menu-toggle')
        ?.focus(),
    );
  }
}
