import {
  Component, HostListener, inject, OnInit, signal
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

import {
  NetworkViewParameters, ReportViewParameters, SystemCheckMessages, SystemContextViewParameters, Unit
} from './interfaces/unit';
import { CheckState } from './interfaces/model';
import { FileService } from './services/file.service';
import { Welcome } from './views/welcome/welcome';
import { SystemCheck } from './views/system-check/system-check';
import { NetworkCheck } from './views/network-check/network-check';
import { Report } from './views/report/report';

import { VopStartCommand } from '../../../verona/verona.interfaces';
import { VeronaAPIService } from 'player/src/app/verona-api.service';

@Component({
  selector: 'syscheck-player',
  imports: [
    MatButtonModule,
    Welcome,
    SystemCheck,
    NetworkCheck,
    Report
  ],
  templateUrl: 'app.html',
  styleUrl: 'app.scss'
})
export class App implements OnInit {
  private readonly veronaAPI = inject(VeronaAPIService);

  isStandalone = window === window.parent;
  unit = signal<Unit | undefined>(undefined);
  readonly sharedParameters = this.veronaAPI.sharedParameters;

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

  get reportViewParameters(): ReportViewParameters {
    return (this.unit()?.viewParameters as ReportViewParameters) ?? {};
  }

  get systemCheckMessages(): SystemCheckMessages {
    return this.unit()?.messages ?? {};
  }

  get resourceURL(): string | undefined {
    return this.veronaAPI.resourceURL;
  }

  onStateChanged(state: CheckState): void {
    this.veronaAPI.sendState(state.dataParts, state.sharedParameters);
  }

  onNextStep(): void {
    this.veronaAPI.sendNavRequest();
  }

  onFinish(): void {
    this.veronaAPI.sendNavRequest('end');
  }

  /**
   * Accepts either a bare unit definition or a complete vopStartCommand. The latter is posted to
   * this window, so it takes the same route as one from a host - e.g. to simulate the sharedParameters
   * a host collected from the system and network units.
   */
  async loadUnitFromFile(eventTarget: EventTarget | null): Promise<void> {
    this.unit.set(undefined);
    const loaded = JSON.parse(await FileService.readFileAsText((eventTarget as HTMLInputElement).files?.[0] as File));
    if (loaded.type === 'vopStartCommand') {
      window.postMessage(loaded, '*');
    } else {
      this.unit.set(loaded);
    }
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
