import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NetworkCheck } from './network-check';
import { NetworkViewParameters } from '../../interfaces/unit';
import { Response } from '@iqbspecs/response/response.interface';

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
    messages: {
      error: 'no connection', no_connection: 'no connection row', insufficient: 'too slow, required: {min_speed}'
    }
  };

  let emitted: { key: string; value?: string }[] = [];
  let emittedResponses: Record<string, Response[]> = {};

  async function runWith(
    result: SpeedTestResult | ((size: number) => SpeedTestResult),
    params: NetworkViewParameters = viewParameters
  ): Promise<NetworkCheck> {
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
    fixture.componentRef.setInput('viewParameters', params);
    fixture.componentInstance.stateChanged.subscribe(state => {
      emitted = state.sharedParameters;
      emittedResponses = state.dataParts;
    });
    fixture.detectChanges();
    await vi.waitUntil(() => !fixture.componentInstance.running());
    return fixture.componentInstance;
  }

  it('says no connection is possible only when every request failed', async () => {
    const component = await runWith({ size: 0, durationMs: 10, error: 'network error' });
    expect(component.overallRating()).toBe('insufficient');
    expect(component.overallMessage()).toBe('no connection');
    expect(emitted).toContainEqual({ key: 'download_rating', value: 'no_connection' });
    expect(emitted).toContainEqual({ key: 'download_kbit_actual', value: '0' });
    expect(component.downloadResult()?.message).toBe('no connection row');
    expect(emittedResponses['download']).toEqual([{
      id: 'download', status: 'CODING_COMPLETE', value: '0', score: 0
    }]);
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

  it('sends a scored download response and the kbit values when the connection is good', async () => {
    // 1000 bytes per ms = 1,000,000 B/s = 8000 kbit/s, above goodSpeed
    await runWith(size => ({ size, durationMs: size / 1000, error: null }));
    expect(emitted).toContainEqual({ key: 'download_rating', value: 'good' });
    expect(emitted).toContainEqual({ key: 'download_kbit_actual', value: '8000' });
    expect(emitted).toContainEqual({ key: 'download_kbit_desired', value: '800' });
    expect(emittedResponses['download']).toEqual([{
      id: 'download', status: 'CODING_COMPLETE', value: '8000', score: 1
    }]);
  });

  it('rates insufficient instead of NaN/good when there is nothing to measure', async () => {
    const component = await runWith(
      { size: 0, durationMs: 10, error: null },
      { ...viewParameters, download: { ...viewParameters.download!, items: [] } }
    );
    expect(component.overallRating()).toBe('insufficient');
    expect(emitted).toContainEqual({ key: 'download_kbit_actual', value: '0' });
    expect(emitted).toContainEqual({ key: 'download_rating', value: 'insufficient' });
    expect(emittedResponses['download']?.[0].score).toBe(0);
  });
});
