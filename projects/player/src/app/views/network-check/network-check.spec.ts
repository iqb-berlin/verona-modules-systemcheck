import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NetworkCheck } from './network-check';
import { NetworkViewParameters } from '../../interfaces/unit';
import { SpeedTestResult, SpeedTestService } from '../../services/speed-test.service';

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

describe('NetworkCheck overall message', () => {
  const viewParameters: NetworkViewParameters = {
    download: {
      items: [1000, 2000],
      minSpeed: 100000,
      goodSpeed: 320000,
      maxDeviance: 20000,
      maxErrorPerSequence: 0,
      maxSequenceRepetition: 3
    },
    messages: { error: 'no connection', insufficient: 'too slow, required: {min_speed}' }
  };

  let emitted: { key: string; value?: string }[] = [];

  async function runWith(result: SpeedTestResult | ((size: number) => SpeedTestResult)): Promise<NetworkCheck> {
    TestBed.configureTestingModule({
      imports: [NetworkCheck],
      providers: [{
        provide: SpeedTestService,
        useValue: {
          benchmarkDownloadSize: async (_: string, size: number) => (typeof result === 'function' ? result(size) : result),
          benchmarkDownloadUrl: async () => result
        }
      }]
    });
    const fixture = TestBed.createComponent(NetworkCheck);
    fixture.componentRef.setInput('viewParameters', viewParameters);
    fixture.componentInstance.stateChanged.subscribe(state => { emitted = state.sharedParameters; });
    fixture.detectChanges();
    await vi.waitUntil(() => !fixture.componentInstance.running());
    return fixture.componentInstance;
  }

  it('says no connection is possible only when every request failed', async () => {
    const component = await runWith({ size: 0, durationMs: 10, error: 'network error' });
    expect(component.overallRating()).toBe('insufficient');
    expect(component.overallMessage()).toBe('no connection');
    expect(emitted).toContainEqual({ key: 'download_rating', value: 'no_connection' });
  });

  it('says the connection is too slow when requests succeed below minSpeed', async () => {
    // 1 kB/s, well below minSpeed
    const component = await runWith(size => ({ size, durationMs: size, error: null }));
    expect(component.overallRating()).toBe('insufficient');
    expect(component.overallMessage()).toBe('too slow, required: 0.80 Mbit/s');
    expect(emitted).toContainEqual({ key: 'download_rating', value: 'insufficient' });
  });

  it('says the connection is too slow when only some requests failed', async () => {
    const component = await runWith(size => (size === 1000
      ? { size: 0, durationMs: 10, error: 'timeout' }
      : { size, durationMs: 1, error: null }));
    expect(component.overallMessage()).toBe('too slow, required: 0.80 Mbit/s');
  });
});
