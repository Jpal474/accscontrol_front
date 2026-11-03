import { Component, inject, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { MemberDetails } from '../../interfaces/member-details.interface';

@Component({
  selector: 'app-register-staff',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    PageHeaderComponent,
    SkeletonComponent,
    ConfirmDialogComponent,
  ],
  templateUrl: './register-staff.component.html',
  styleUrl: './register-staff.component.scss',
})
export class RegisterStaffComponent {
  readonly loading = signal(true);
  readonly failed = signal(false);
  readonly busy = signal(false);
  readonly pending = signal<{
    id: string;
    status: 'suspended' | 'revoked';
  } | null>(null);
  readonly dialog = viewChild.required(ConfirmDialogComponent);
  readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    displayName: ['', Validators.required],
    branchId: ['', Validators.required],
    role: ['seller', Validators.required],
  });
  readonly roles: { code: string; label: string }[] = [
    { code: 'seller', label: 'Vendedor' },
    { code: 'technician', label: 'Técnico' },
    { code: 'viewer', label: 'Consulta' },
    { code: 'manager', label: 'Gerente' },
  ];
  readonly members = signal<MemberDetails[]>([]);
  readonly editing = signal<MemberDetails | null>(null);
  public mockMembers: MemberDetails[] = [
    // 1. Active Manager with an existing role and no pending invites
    {
      id: 'mem_001',
      email: 'alice.smith@example.com',
      displayName: 'Alice Smith',
      status: 'active',
      roles: [{ role: 'manager', branchId: 'branch_nyc_01' }],
      invitations: [],
    },

    // 2. Newly Invited Seller with a pending invitation
    {
      id: 'mem_002',
      email: 'bob.jones@example.com',
      displayName: 'Bob Jones',
      status: 'invited',
      roles: [],
      invitations: [
        {
          id: 'inv_101',
          branchId: 'branch_la_02',
          role: 'seller',
          expiresAt: '2026-11-15T23:59:59Z',
          deliveryStatus: 'delivered',
          consumed: false,
          revoked: false,
        },
      ],
    },

    // 3. Suspended Technician with multiple roles/branches and past history
    {
      id: 'mem_003',
      email: 'charlie.brown@example.com',
      displayName: 'Charlie Brown',
      status: 'suspended',
      roles: [
        { role: 'technician', branchId: 'branch_chi_03' },
        { role: 'viewer', branchId: null },
      ],
      invitations: [
        {
          id: 'inv_102',
          branchId: 'branch_chi_03',
          role: 'technician',
          expiresAt: '2025-10-01T00:00:00Z',
          deliveryStatus: 'delivered',
          consumed: true,
          revoked: false,
        },
      ],
    },

    // 4. Revoked Member whose invitation was canceled/revoked
    {
      id: 'mem_004',
      email: 'diana.prince@example.com',
      displayName: 'Diana Prince',
      status: 'revoked',
      roles: [],
      invitations: [
        {
          id: 'inv_103',
          branchId: 'branch_mia_04',
          role: 'viewer',
          expiresAt: '2026-11-01T23:59:59Z',
          deliveryStatus: 'failed',
          consumed: false,
          revoked: true,
        },
      ],
    },
  ];

  constructor() {
    void this.load();
  }

  async load() {
    this.loading.set(true);
    this.failed.set(false);
    try {
      this.members.set(this.mockMembers);
    } catch {
      this.failed.set(true);
    } finally {
      this.loading.set(false);
    }
  }
  cancel() {
    this.editing.set(null);
    this.form.reset({
      email: '',
      displayName: '',
      branchId: '',
      role: 'seller',
    });
  }
  async confirm() {
    const change = this.pending();
    if (!change) return;
    // await this.update(change.id, change.status);
    this.pending.set(null);
  }

  owner(member: MemberDetails) {
    return member.roles.some((role) => role.role === 'owner');
  }
}
