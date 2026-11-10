import { TestBed } from '@angular/core/testing';

import { SelectedStoreService } from './selected-store.service';

describe('SelectedStoreService', () => {
  let service: SelectedStoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SelectedStoreService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
