import { Component, HostListener, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { Unit } from 'common/interfaces/unit';
import { FileService } from 'common/services/file.service';
import { Welcome } from './views/welcome';
import { Systemcontext } from './views/systemcontext';
import { MatIcon } from '@angular/material/icon';
import { fromEvent } from 'rxjs';
import { StartCommand, VeronaAPIService } from 'player/src/app/verona-api.service';

@Component({
  selector: 'syscheck-player',
  imports: [
    MatButtonModule,
    Welcome,
    Systemcontext,
    MatIcon],
  template: `
    @if (isStandalone) {
      <button mat-raised-button class="load-button" (click)="upload.click()">
        Unit laden
        <mat-icon>file_upload</mat-icon>
      </button>
      <input type="file" hidden accept=".json, .voud" #upload
             (change)="loadUnitFromFile($event.target)">
    }
    @if (unit?.view?.viewType  === 'welcome') {
      <syscheck-player-welcome></syscheck-player-welcome>
    } @else if (unit?.view?.viewType === 'systemContext') {
      <syscheck-player-system-context></syscheck-player-system-context>
    }
  `,
  styles: ''
})
export class App implements OnInit {
  isStandalone = window === window.parent;
  unit: Unit | undefined;

  /* Set up listener for incoming messages via window.postMessage().
     The actual message handling is done by the API service. */
  constructor() {
    fromEvent(window, 'message')
      .subscribe((event: Event): void => {
        VeronaAPIService.handleMessage((event as MessageEvent).data);
      });
  }

  ngOnInit(): void {
    this.unit = this.hardCodedUnit;
    VeronaAPIService.startCommand$
      .subscribe((message: StartCommand): void => {
        if (!message.unitDefinition) return;
        this.resetUnit();
        this.unit = JSON.parse(message.unitDefinition);
        VeronaAPIService.sendState({});
      });
    VeronaAPIService.sendReady();
  }

  private resetUnit(): void {
    this.unit = undefined;
  }

  async loadUnitFromFile(eventTarget: EventTarget | null): Promise<void> {
    this.resetUnit();
    const loadedUnit = await FileService.readFileAsText((eventTarget as HTMLInputElement).files?.[0] as File);
    this.unit = JSON.parse(loadedUnit);
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

  hardCodedUnit: Unit =
    {
      type: 'syscheck-unit-definition',
      version: 'tbd',
      view: {
        viewType: 'welcome',
        // viewParameters: {
        //   browser: true,
        //   os: true,
        //   resolution: true,
        //   microphone: true,
        //   cookies: true,
        //   plugins: true,
        //   language: true,
        //   timeDeviation: true,
        //   timeZone: true
        // }
      }
      // "view": "systemContext"
      // "view": "network"
      // "view": "report"
    };
}
