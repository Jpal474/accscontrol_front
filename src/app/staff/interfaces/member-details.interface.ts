export interface MemberDetails {
  id: string;
  email: string;
  displayName: string;
  status: 'invited' | 'active' | 'suspended' | 'revoked';
  roles: { role: string; branchId: string | null }[];
  invitations: {
    id: string;
    branchId: string;
    role: EmployeeRole;
    expiresAt: string;
    deliveryStatus: string;
    consumed: boolean;
    revoked: boolean;
  }[];
}

export type EmployeeRole = 'manager' | 'seller' | 'technician' | 'viewer';
