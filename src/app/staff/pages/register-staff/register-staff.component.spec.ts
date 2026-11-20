import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { RegisterStaffComponent } from './register-staff.component';
import { StaffService } from '../../services/staff.service';
import { CatalogsService } from '../../../shared/services/catalogs.service';
import { SelectedStoreService } from '../../../shared/services/selected-store.service';
import { ToastService } from '../../../shared/services/toast.service';

describe('Staff registration in the active store', () => {
  let component: RegisterStaffComponent;
  let fixture: ComponentFixture<RegisterStaffComponent>;
  let selectedStore: SelectedStoreService;
  let staff: jasmine.SpyObj<StaffService>;
  beforeEach(async () => {
    staff = jasmine.createSpyObj('StaffService', ['createStaff', 'updateStaff', 'getStaffMemberById']);
    staff.createStaff.and.returnValue(of({ data: {} } as any));
    await TestBed.configureTestingModule({ imports: [RegisterStaffComponent], providers: [provideRouter([]),
      { provide: StaffService, useValue: staff },
      { provide: CatalogsService, useValue: { getRoles: () => of({ data: [{ id: 'seller', value: 'Seller' }], meta: { totalPages: 1, total: 1 } }) } },
      { provide: ToastService, useValue: { show: jasmine.createSpy() } },
    ] }).compileComponents();
    selectedStore = TestBed.inject(SelectedStoreService); selectedStore.setSelectedStore(null);
    fixture = TestBed.createComponent(RegisterStaffComponent); component = fixture.componentInstance; fixture.detectChanges();
    component.form.setValue({ name: 'Test', lastName: 'Staff', email: 'test@example.com', roleId: 'seller' });
    spyOn(console, 'error');
  });
  afterEach(() => selectedStore.setSelectedStore(null));
  it('explains the missing store instead of sending an invalid store-scoped request', () => {
    expect(fixture.nativeElement.textContent).toContain('Selecciona una tienda');
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
    component.onSubmit(); expect(staff.createStaff).not.toHaveBeenCalled(); expect(component.error()).toContain('Selecciona una tienda');
  });
  it('allows registration once the owner selects a store', () => {
    selectedStore.setSelectedStore('owner-store'); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('form')).not.toBeNull();
    component.onSubmit();
    expect(staff.createStaff).toHaveBeenCalledWith({ name: 'Test', lastName: 'Staff', email: 'test@example.com', roleId: 'seller' });
    expect(component.registered()).toBeTrue(); expect(component.busy()).toBeFalse();
  });
  it('displays errors preserved by the global error interceptor', () => {
    selectedStore.setSelectedStore('owner-store');
    staff.createStaff.and.returnValue(throwError(() => new Error('No se puede asignar ese rol')));
    component.onSubmit(); fixture.detectChanges();
    expect(component.error()).toBe('No se puede asignar ese rol'); expect(component.busy()).toBeFalse();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('No se puede asignar ese rol');
  });
});
