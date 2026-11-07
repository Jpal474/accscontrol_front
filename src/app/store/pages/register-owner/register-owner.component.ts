import { Component, Inject, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StoreService } from '../../services/store.service';
import { RegisterOwnerInterface } from '../../interfaces/owner.interface';
import { ToastService } from '../../../shared/services/toast.service';
import { RoutesService } from '../../../shared/services/routes.service';

@Component({
  selector: 'app-register-owner',
  standalone: true,
  imports: [ReactiveFormsModule, RouterModule, PageHeaderComponent],
  templateUrl: './register-owner.component.html',
  styleUrl: './register-owner.component.scss',
})
export class RegisterOwnerComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly storesService = inject(StoreService);
  private readonly route = inject(ActivatedRoute);
  private readonly toastService = inject(ToastService);
  private readonly routesService = inject(RoutesService);
  readonly busy = signal(false);
  readonly registered = signal(false);

  // Señales para el modo edición
  readonly isEditing = signal(false);
  readonly ownerId = signal<string | null>(null);

  readonly owner = this.fb.nonNullable.group({
    name: [
      '',
      [
        Validators.required,
        Validators.maxLength(160),
        Validators.pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/),
      ],
    ],
    lastName: [
      '',
      [
        Validators.required,
        Validators.maxLength(160),
        Validators.pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/),
      ],
    ],
    // lastName2: [
    //   '',
    //   [
    //     Validators.maxLength(160),
    //     Validators.pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]*$/),
    //   ],
    // ],
    email: [
      '',
      [Validators.required, Validators.email, Validators.maxLength(254)],
    ],
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('ownerId');
    if (id) {
      this.isEditing.set(true);
      this.ownerId.set(id);
      this.loadOwnerData(id);
    }
  }

  // Carga los datos del dueño para editarlos
  private loadOwnerData(id: string) {
    this.busy.set(true);
    this.storesService.getOwnerById(id).subscribe({
      next: (response) => {
        const data = response.data;

        this.owner.patchValue({
          name: data.name,
          lastName: data.lastName,
          email: data.email,
        });
        this.busy.set(false);
      },
      error: () => {
        this.toastService.show(
          'No se pudieron cargar los datos del dueño.',
          'error',
        );
        this.busy.set(false);
        // this.router.navigate(['/stores/owners']); // Regresar si falla
      },
    });
  }

  public submit(): void {
    if (this.owner.invalid || this.busy()) {
      this.owner.markAllAsTouched();
      return;
    }

    this.busy.set(true);

    const ownerData: RegisterOwnerInterface = this.owner.getRawValue();
    if (this.isEditing() && this.ownerId()) {
      // --- MODO EDICIÓN ---
      this.storesService.updateOwner(this.ownerId()!, ownerData).subscribe({
        next: (response) => {
          if (response.success) {
            this.toastService.show(
              'Dueño actualizado correctamente',
              'success',
            );
            this.routesService.redirectTo(
              this.routesService.routes.app.owner.list,
            );
          }
          this.busy.set(false);
        },
        error: (err) => {
          this.busy.set(false);
          // El interceptor global ya maneja el toast de error, pero puedes complementar si deseas
        },
      });
    } else {
      // --- MODO CREACIÓN ---
      this.storesService.createStoreOwner(ownerData).subscribe({
        next: (response) => {
          if (response.success) {
            this.registered.set(true);
            this.toastService.show('Dueño registrado exitosamente', 'success');
          }
          this.owner.reset();
          this.busy.set(false);
        },
        error: () => {
          this.busy.set(false);
        },
      });
    }
  }
}
