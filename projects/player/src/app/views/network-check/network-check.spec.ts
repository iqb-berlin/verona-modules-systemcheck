import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NetworkCheck } from './network-check';

describe('NetworkCheck', () => {
  let component: NetworkCheck;
  let fixture: ComponentFixture<NetworkCheck>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NetworkCheck],
    }).compileComponents();

    fixture = TestBed.createComponent(NetworkCheck);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('viewParameters', {});
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
