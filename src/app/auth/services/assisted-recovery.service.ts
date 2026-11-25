import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment.development';
import { ApiStandardResponse } from '../../shared/interfaces/api-response.interface';

export interface AssistedRecoveryPreview {
  email: string;
  multipleStores: boolean;
}

@Injectable({ providedIn: 'root' })
export class AssistedRecoveryService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}auth/assisted-recovery`;

  preview(userId: string, storeId?: string) {
    return this.http.get<ApiStandardResponse<AssistedRecoveryPreview>>(
      `${this.base}/${encodeURIComponent(userId)}`, { params: storeId ? { storeId } : {} },
    );
  }

  send(userId: string, currentPassword: string, storeId?: string) {
    return this.http.post<ApiStandardResponse<{ accepted: boolean }>>(
      `${this.base}/${encodeURIComponent(userId)}`, { currentPassword, storeId, identityConfirmation: true },
    );
  }
}
