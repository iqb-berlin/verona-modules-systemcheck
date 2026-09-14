import { Component, HostListener, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { fromEvent } from 'rxjs';

import {
  NetworkViewParameters, SystemCheckMessages, SystemContextViewParameters, Unit
} from './interfaces/unit';
import { FileService } from './services/file.service';
import { Welcome } from './views/welcome/welcome';
import { SystemCheck } from './views/system-check/system-check';
import { NetworkCheck } from './views/network-check/network-check';

import { PlayerConfig } from '../../../verona/verona';
import { StartCommand, VeronaAPIService } from 'player/src/app/verona-api.service';

@Component({
  selector: 'syscheck-player',
  imports: [
    MatButtonModule,
    Welcome,
    SystemCheck,
    NetworkCheck
  ],
  templateUrl: 'app.html',
  styleUrl: 'app.scss'
})
export class App implements OnInit {
  isStandalone = window === window.parent;
  unit = signal<Unit | undefined>(undefined);
  playerConfig = signal<PlayerConfig | undefined>(undefined);

  constructor() {
    fromEvent(window, 'message')
      .subscribe((event: Event): void => {
        VeronaAPIService.handleMessage((event as MessageEvent).data);
      });
  }

  ngOnInit(): void {
    VeronaAPIService.startCommand$
      .subscribe((message: StartCommand): void => {
        if (!message.unitDefinition) return;
        this.unit.set(JSON.parse(message.unitDefinition));
        this.playerConfig.set(message.playerConfig);
        VeronaAPIService.sendState({});
      });
    VeronaAPIService.sendReady();
  }

  get systemContextViewParameters(): SystemContextViewParameters {
    return (this.unit()?.viewParameters as SystemContextViewParameters) ?? {};
  }

  get networkViewParameters(): NetworkViewParameters {
    return (this.unit()?.viewParameters as NetworkViewParameters) ?? {};
  }

  get systemCheckMessages(): SystemCheckMessages {
    return this.unit()?.messages ?? {};
  }

  async loadUnitFromFile(eventTarget: EventTarget | null): Promise<void> {
    this.unit.set(undefined);
    const loadedUnit = await FileService.readFileAsText((eventTarget as HTMLInputElement).files?.[0] as File);
    this.unit.set(JSON.parse(loadedUnit));
  }

  // eslint-disable-next-line class-methods-use-this
  @HostListener('window:blur')
  onBlur() {
    VeronaAPIService.sendFocusChanged(false);
  }

  // eslint-disable-next-line class-methods-use-this
  @HostListener('window:focus')
  onFocus() {
    VeronaAPIService.sendFocusChanged(true);
  }
}
