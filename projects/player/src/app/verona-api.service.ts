import { Injectable, inject, signal } from '@angular/core';
import { Response } from '@iqbspecs/response/response.interface';

import { VeronaPostService } from '../../../verona/verona-post.service';
import { VeronaSubscriptionService } from '../../../verona/verona-subscription.service';
import {
  NavigationTarget, SharedParameter, VeronaMetaData, VopStartCommand
} from '../../../verona/verona.interfaces';

const UnitStateDataType = 'iqb-standard@2.0';

/**
 * Thin adapter over VeronaPostService/VeronaSubscriptionService (projects/verona) tailored
 * to what this player needs: extracting metadata from the DOM for the ready notification,
 * bridging the incoming sessionId/resourceURL into those services, and shaping unit state.
 */
@Injectable({
  providedIn: 'root'
})
export class VeronaAPIService {
  private readonly veronaPost = inject(VeronaPostService);
  private readonly veronaSubscription = inject(VeronaSubscriptionService);

  readonly startCommand$ = this.veronaSubscription.vopStartCommand;

  /** shared parameters the host collected from other units, e.g. the system and network check results */
  readonly sharedParameters = signal<SharedParameter[]>([]);

  constructor() {
    this.startCommand$.subscribe((message: VopStartCommand) => {
      this.veronaPost.sessionID = message.sessionId;
      this.veronaSubscription.resourceURL = message.playerConfig?.directDownloadUrl;
      this.sharedParameters.set(message.playerConfig?.sharedParameters ?? []);
    });
    this.veronaSubscription.vopPlayerConfigChangedNotification.subscribe(message => {
      if (message.playerConfig.sharedParameters) this.sharedParameters.set(message.playerConfig.sharedParameters);
    });
  }

  get resourceURL(): string | undefined {
    return this.veronaSubscription.resourceURL;
  }

  sendReady(): void {
    const metadataText = document.getElementById('meta_data')?.textContent;
    const metadata = (metadataText ? JSON.parse(metadataText) : {}) as VeronaMetaData;
    this.veronaPost.sendVopReadyNotification(metadata);
  }

  sendNavRequest(target: NavigationTarget = 'next'): void {
    this.veronaPost.sendVopUnitNavigationRequestedNotification(target);
  }

  sendState(dataParts: Record<string, Response[]>, sharedParameters?: SharedParameter[]): void {
    const hasData = Object.keys(dataParts).length > 0;
    this.veronaPost.sendVopStateChangedNotification({
      unitState: {
        unitStateDataType: UnitStateDataType,
        presentationProgress: 'complete',
        responseProgress: hasData ? 'complete' : 'none',
        dataParts: VeronaAPIService.stringifyAllValues(dataParts)
      },
      ...(sharedParameters?.length ? { playerState: { sharedParameters } } : {})
    });
  }

  private static stringifyAllValues(dataParts: Record<string, Response[]>): Record<string, string> {
    return Object.entries(dataParts).reduce((acc: Record<string, string>, [key, value]) => {
      acc[key] = JSON.stringify(value);
      return acc;
    }, {});
  }

  sendFocusChanged(isFocused: boolean): void {
    this.veronaPost.sendVopWindowFocusChangedNotification(isFocused);
  }
}
