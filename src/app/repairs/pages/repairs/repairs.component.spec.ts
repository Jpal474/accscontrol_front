import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../../auth/services/auth.service';
import { SelectedStoreService } from '../../../shared/services/selected-store.service';
import { RepairsService } from '../../repairs.service';
import { RepairsComponent } from './repairs.component';

describe('RepairsComponent', () => {
  it('loads the technician’s own repairs and hides reception', async () => {
    const list = jasmine.createSpy().and.returnValue(of({ data: [], meta: { total: 0, totalPages: 0 } }));
    TestBed.configureTestingModule({
      imports: [RepairsComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: {
          hasPermission: (permission: string) => permission === 'view_own_repairs',
          currentUser: signal({ id: 'technician' }),
        } },
        { provide: SelectedStoreService, useValue: { selectedStoreId: signal('store') } },
        { provide: RepairsService, useValue: { list } },
      ],
    });
    const fixture = TestBed.createComponent(RepairsComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(list).toHaveBeenCalledOnceWith(1, '', 'technician');
    expect(fixture.nativeElement.querySelector('.editor-section')).toBeNull();
  });
});
