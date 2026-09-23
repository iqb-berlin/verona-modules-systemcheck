import { TestBed } from '@angular/core/testing';

import { VopStartCommand } from '../../../verona/verona';
import { VeronaAPIService } from './verona-api.service';

function dispatchVopMessage(data: unknown): void {
  window.dispatchEvent(new MessageEvent('message', { data }));
}

describe('VeronaAPIService', () => {
  let service: VeronaAPIService;
  let postMessageSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(VeronaAPIService);
    postMessageSpy = vi.spyOn(window.parent, 'postMessage').mockImplementation(() => {});
  });

  afterEach(() => {
    postMessageSpy.mockRestore();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('routes an incoming vopStartCommand through startCommand$ and remembers its sessionId', () => {
    const sessionId = `test-session-${Date.now()}`;
    const startCommand: VopStartCommand = {
      type: 'vopStartCommand',
      sessionId,
      unitDefinition: '{}'
    };
    const received: VopStartCommand[] = [];
    const subscription = service.startCommand$.subscribe(message => received.push(message));

    dispatchVopMessage(startCommand);
    subscription.unsubscribe();

    expect(received).toEqual([startCommand]);

    service.sendState({});
    const [message] = postMessageSpy.mock.calls.at(-1) as [{ sessionId: string }, string];
    expect(message.sessionId).toBe(sessionId);
  });

  it('remembers resourceURL from the incoming vopStartCommand playerConfig', () => {
    expect(service.resourceURL).toBeUndefined();

    dispatchVopMessage({
      type: 'vopStartCommand',
      sessionId: 'resource-url-test',
      unitDefinition: '{}',
      playerConfig: { directDownloadUrl: 'https://example.org/download' }
    } satisfies VopStartCommand);

    expect(service.resourceURL).toBe('https://example.org/download');
  });

  it('ignores messages of an unhandled type', () => {
    const received: VopStartCommand[] = [];
    const subscription = service.startCommand$.subscribe(message => received.push(message));

    dispatchVopMessage({ type: 'somethingElse' });
    subscription.unsubscribe();

    expect(received).toEqual([]);
  });

  it('sendReady posts a vopReadyNotification', () => {
    service.sendReady();
    expect(postMessageSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'vopReadyNotification' }),
      '*'
    );
  });

  it('sendState posts each data part as a JSON string, with progress flags reflecting whether data was given', () => {
    service.sendState({
      browser: [{
        id: 'browser', status: 'CODING_COMPLETE', value: 'Chrome', score: 1
      }]
    });
    const [withData] = postMessageSpy.mock.calls.at(-1) as [{
      unitState: { responseProgress: string; dataParts: Record<string, string> }
    }, string];
    expect(withData.unitState.responseProgress).toBe('complete');
    expect(JSON.parse(withData.unitState.dataParts['browser'])).toEqual([
      {
        id: 'browser', status: 'CODING_COMPLETE', value: 'Chrome', score: 1
      }
    ]);

    service.sendState({});
    const [withoutData] = postMessageSpy.mock.calls.at(-1) as [{ unitState: { responseProgress: string } }, string];
    expect(withoutData.unitState.responseProgress).toBe('none');
  });

  it('sendFocusChanged posts a vopWindowFocusChangedNotification with the given focus state', () => {
    service.sendFocusChanged(true);
    expect(postMessageSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'vopWindowFocusChangedNotification', hasFocus: true }),
      '*'
    );
  });

  it('sendNavRequest posts a vopUnitNavigationRequestedNotification targeting next', () => {
    service.sendNavRequest();
    expect(postMessageSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'vopUnitNavigationRequestedNotification', target: 'next' }),
      '*'
    );
  });
});
