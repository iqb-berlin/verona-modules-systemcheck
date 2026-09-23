import {
  Component, HostListener, inject, OnInit, signal
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

import {
  NetworkViewParameters, SystemCheckMessages, SystemContextViewParameters, Unit
} from './interfaces/unit';
import { FileService } from './services/file.service';
import { Welcome } from './views/welcome/welcome';
import { SystemCheck, SystemCheckState } from './views/system-check/system-check';
import { NetworkCheck } from './views/network-check/network-check';

import { VopStartCommand } from '../../../verona/verona';
import { VeronaAPIService } from 'player/src/app/verona-api.service';

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
  private readonly veronaAPI = inject(VeronaAPIService);

  isStandalone = window === window.parent;
  unit = signal<Unit | undefined>(undefined);

  ngOnInit(): void {
    this.veronaAPI.startCommand$
      .subscribe((message: VopStartCommand): void => {
        if (!message.unitDefinition) return;
        this.unit.set(JSON.parse(message.unitDefinition));
        this.veronaAPI.sendState({});
      });
    this.veronaAPI.sendReady();
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

  get resourceURL(): string | undefined {
    return this.veronaAPI.resourceURL;
  }

  onSystemCheckStateChanged(state: SystemCheckState): void {
    this.veronaAPI.sendState({ ...state });
  }

  onNextStep(): void {
    this.veronaAPI.sendNavRequest();
  }

  async loadUnitFromFile(eventTarget: EventTarget | null): Promise<void> {
    this.unit.set(undefined);
    const loadedUnit = await FileService.readFileAsText((eventTarget as HTMLInputElement).files?.[0] as File);
    this.unit.set(JSON.parse(loadedUnit));
  }

  @HostListener('window:blur')
  onBlur() {
    this.veronaAPI.sendFocusChanged(false);
  }

  @HostListener('window:focus')
  onFocus() {
    this.veronaAPI.sendFocusChanged(true);
  }
}
