import { Injectable, inject } from '@angular/core';
import { Response } from '@iqbspecs/response/response.interface';

import { VeronaPostService } from '../../../verona/verona-post.service';
import { VeronaSubscriptionService } from '../../../verona/verona-subscription.service';
import { UnitStateDataType, VopMetaData, VopStartCommand } from '../../../verona/verona';

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

  constructor() {
    this.startCommand$.subscribe((message: VopStartCommand) => {
      this.veronaPost.sessionID = message.sessionId;
      this.veronaSubscription.resourceURL = message.playerConfig?.directDownloadUrl;
    });
  }

  get resourceURL(): string | undefined {
    return this.veronaSubscription.resourceURL;
  }

  sendReady(): void {
    const metadataText = document.getElementById('meta_data')?.textContent;
    const metadata = (metadataText ? JSON.parse(metadataText) : {}) as VopMetaData;
    this.veronaPost.sendReadyNotification(metadata);
  }

  sendNavRequest(): void {
    this.veronaPost.sendVopUnitNavigationRequestedNotification('next');
  }

  sendState(dataParts: Record<string, Response[]>): void {
    const hasData = Object.keys(dataParts).length > 0;
    this.veronaPost.sendVopStateChangedNotification({
      unitState: {
        unitStateDataType: UnitStateDataType,
        presentationProgress: 'complete',
        responseProgress: hasData ? 'complete' : 'none',
        dataParts: VeronaAPIService.stringifyAllValues(dataParts)
      }
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
