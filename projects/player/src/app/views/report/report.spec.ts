import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Report } from './report';

describe('Report', () => {
  let component: Report;
  let fixture: ComponentFixture<Report>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Report],
    }).compileComponents();

    fixture = TestBed.createComponent(Report);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('viewParameters', {});
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('rates the shared parameters against the configured requirements', () => {
    fixture.componentRef.setInput('viewParameters', {
      system: {
        browser: { enabled: true, limits: [{ browser: 'chrome', minVersion: '143' }] },
        resolution: { enabled: true, limits: [{ width: 1200, height: 800 }] }
      }
    });
    fixture.componentRef.setInput('sharedParameters', [
      { key: 'browser_label', value: 'Chrome' },
      { key: 'browser_version', value: '139.0.0.0' },
      { key: 'resolution', value: '1920x1080' },
      { key: 'download_kbit_actual', value: '25340' },
      { key: 'download_kbit_desired', value: '800' },
      { key: 'download_rating', value: 'good' }
    ]);

    const system = Object.fromEntries(component.systemRows().map(row => [row.id, row]));
    expect(system['browser']).toMatchObject({ detected: 'Chrome 139.0.0.0', status: 'failed' });
    expect(system['resolution']).toMatchObject({ detected: '1920 x 1080 Pixel', status: 'ok' });
    expect(system['os'].status).toBeUndefined();

    const network = Object.fromEntries(component.networkRows().map(row => [row.id, row]));
    expect(network['download']).toMatchObject({ detected: '∅ 25.34 Mbit/s', status: 'ok' });
    expect(network['downloadDesired'].detected).toBe('0.80 Mbit/s');

    expect(component.allPassed()).toBe(false);
  });

  it('shows a failed download when no connection was possible', () => {
    fixture.componentRef.setInput('viewParameters', { messages: { download_no_connection: 'no connection' } });
    fixture.componentRef.setInput('sharedParameters', [
      { key: 'download_kbit_actual', value: '0' },
      { key: 'download_rating', value: 'no_connection' }
    ]);
    const download = component.networkRows().find(row => row.id === 'download');
    expect(download).toMatchObject({ status: 'failed', message: 'no connection' });
  });
});
