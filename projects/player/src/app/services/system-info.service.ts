import { Injectable, signal } from '@angular/core';
import * as BowserNamespace from 'bowser';

// bowser is a CommonJS module (`export =`); depending on the bundler's interop,
// the actual exports land either on the namespace object itself or on `.default`.
const Bowser = ((BowserNamespace as { default?: typeof BowserNamespace }).default) ?? BowserNamespace;

export interface Resolution {
  width: number;
  height: number;
}

@Injectable({
  providedIn: 'root'
})
export class SystemInfoService {
  private readonly parser = Bowser.getParser(window.navigator.userAgent);

  readonly windowResolution = signal<Resolution>(SystemInfoService.readWindowResolution());

  constructor() {
    // eslint-disable-next-line no-console
    console.log('syscheck: detected user agent info', {
      userAgent: this.parser.getUA(),
      ...this.parser.getResult()
    });

    window.addEventListener('resize', () => {
      this.windowResolution.set(SystemInfoService.readWindowResolution());
    });
  }

  private static readWindowResolution(): Resolution {
    return { width: window.innerWidth, height: window.innerHeight };
  }

  get browserName(): string {
    return this.parser.getBrowserName();
  }

  get browserVersion(): string {
    return this.parser.getBrowserVersion() ?? '';
  }

  get osName(): string {
    return this.parser.getOSName();
  }

  get osVersion(): string {
    return this.parser.getOSVersion() ?? '';
  }

  get deviceType(): string {
    return this.parser.getPlatformType() || 'desktop';
  }

  get screenResolution(): Resolution {
    return { width: window.screen.width, height: window.screen.height };
  }

  // eslint-disable-next-line class-methods-use-this
  get hasTouch(): boolean {
    return navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
  }

  // eslint-disable-next-line class-methods-use-this
  get hasWebGL(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
    } catch {
      return false;
    }
  }
}
