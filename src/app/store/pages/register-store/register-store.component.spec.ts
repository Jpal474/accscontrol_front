import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegisterStoreComponent } from './register-store.component';

describe('RegisterStoreComponent', () => {
  let component: RegisterStoreComponent;
  let fixture: ComponentFixture<RegisterStoreComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegisterStoreComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(RegisterStoreComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
