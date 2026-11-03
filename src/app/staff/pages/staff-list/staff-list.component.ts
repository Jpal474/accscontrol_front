import { Component, signal } from '@angular/core';
import { MemberDetails } from '../../interfaces/member-details.interface';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';

@Component({
  selector: 'app-staff-list',
  standalone: true,
  imports: [PageHeaderComponent, SkeletonComponent],
  templateUrl: './staff-list.component.html',
  styleUrl: './staff-list.component.scss',
})
export class StaffListComponent {
  readonly loading = signal(true);
  readonly failed = signal(false);
  readonly busy = signal(false);
  readonly members = signal<MemberDetails[]>([]);
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

  owner(member: MemberDetails) {
    return member.roles.some((role) => role.role === 'owner');
  }
}
