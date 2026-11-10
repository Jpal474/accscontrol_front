import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.development';
import { ApiStandardResponse } from '../../shared/interfaces/api-response.interface';
import {
  RegisterStaffInterface,
  RegisterStaffResponse,
  StoreStaffItem,
} from '../interfaces/staff.interface';
import { RegisterStaffComponent } from '../pages/register-staff/register-staff.component';

@Injectable({
  providedIn: 'root',
})
export class StaffService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}users/staff`;

  public createStaff(
    body: RegisterStaffInterface,
  ): Observable<ApiStandardResponse<RegisterStaffResponse>> {
    return this.http.post<ApiStandardResponse<RegisterStaffResponse>>(
      `${this.base}/create`,
      body,
    );
  }

  public updateStaff(
    id: string,
    body: RegisterStaffInterface,
  ): Observable<any> {
    return this.http.patch<ApiStandardResponse<RegisterStaffResponse>>(
      `${this.base}/${id}/update`,
      body,
    );
  }

  public getStaffMemberById(
    id: string,
  ): Observable<ApiStandardResponse<StoreStaffItem>> {
    return this.http.get<ApiStandardResponse<StoreStaffItem>>(
      `${this.base}/${id}/get`,
    );
  }
}
