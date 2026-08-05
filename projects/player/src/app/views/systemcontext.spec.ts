import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Systemcontext } from './systemcontext';

describe('Systemcontext', () => {
  let component: Systemcontext;
  let fixture: ComponentFixture<Systemcontext>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Systemcontext],
    }).compileComponents();

    fixture = TestBed.createComponent(Systemcontext);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
