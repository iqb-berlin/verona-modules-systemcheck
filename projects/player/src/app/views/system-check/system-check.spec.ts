import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SystemCheck } from './system-check';

describe('SystemCheck', () => {
  let component: SystemCheck;
  let fixture: ComponentFixture<SystemCheck>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SystemCheck],
    }).compileComponents();

    fixture = TestBed.createComponent(SystemCheck);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('viewParameters', {});
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
