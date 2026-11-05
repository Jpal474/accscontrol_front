import { inject, Injectable } from '@angular/core';
import { AccessRequestInterface } from '../interfaces/access-request.interface';
import { environment } from '../../../environments/environment.development';
import { HttpBackend, HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class PublicService {
  private readonly httpBackend = inject(HttpBackend);
  private readonly http = new HttpClient(this.httpBackend);

  private readonly base = `${environment.apiUrl}auth`;

  public sendAccessRequestMail(
    accessRequestInfo: AccessRequestInterface,
  ): Observable<any> {
    return this.http.post<void>(
      `${this.base}/request-access`,
      accessRequestInfo,
    );
  }
}
