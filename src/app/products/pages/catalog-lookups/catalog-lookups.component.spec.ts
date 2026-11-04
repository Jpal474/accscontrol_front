import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CatalogLookupsComponent } from './catalog-lookups.component';

describe('CatalogLookupsComponent', () => {
  let component: CatalogLookupsComponent;
  let fixture: ComponentFixture<CatalogLookupsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CatalogLookupsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CatalogLookupsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
