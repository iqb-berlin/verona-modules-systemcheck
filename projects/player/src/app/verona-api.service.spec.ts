import { TestBed } from '@angular/core/testing';

import { VeronaAPIService } from './verona-api.service';

describe('VeronaAPI', () => {
  let service: VeronaAPIService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(VeronaAPIService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
