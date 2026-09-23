import {
  Component, computed, effect, inject, input, output, signal
} from '@angular/core';
import { Response } from '@iqbspecs/response/response.interface';

import { CheckRow, CheckRowStatus } from '../../components/check-row/check-row';
import {
  BrowserLimit, OsLimit, SystemCheckMessages, SystemContextViewParameters
} from '../../interfaces/unit';
import { SystemInfoService } from '../../services/system-info.service';

export type CheckedRowId = 'browser' | 'os' | 'resolution' | 'touch' | 'webgl';
export type SystemCheckRowId = CheckedRowId | 'deviceType' | 'windowResolution';

export interface SystemInfoRow {
  id: SystemCheckRowId;
  label: string;
  detected: string;
  /** undefined = informational only, no requirement configured for this row */
  status?: CheckRowStatus;
  message?: string;
}

export type SystemCheckState = Record<CheckedRowId, Response[]>;

function toResponse(id: string, value: string, ok: boolean): Response {
  return {
    id, status: 'CODING_COMPLETE', value, score: ok ? 1 : 0
  };
}

function versionAtLeast(actual: string, required: string): boolean {
  const actualParts = actual.split('.').map(part => Number(part) || 0);
  const requiredParts = required.split('.').map(part => Number(part) || 0);
  const length = Math.max(actualParts.length, requiredParts.length);
  for (let i = 0; i < length; i += 1) {
    const actualPart = actualParts[i] ?? 0;
    const requiredPart = requiredParts[i] ?? 0;
    if (actualPart !== requiredPart) return actualPart > requiredPart;
  }
  return true;
}

function evaluateNamedLimit(
  id: CheckedRowId,
  label: string,
  detected: string,
  limit: BrowserLimit | OsLimit | undefined,
  detectedVersion: string,
  notSupportedMessage: string | undefined,
  versionNotSupportedMessage: string | undefined
): SystemInfoRow {
  if (!limit) {
    return {
      id, label, detected, status: 'warning', message: notSupportedMessage
    };
  }
  if (!limit.minVersion) {
    return {
      id, label, detected, status: 'warning', message: limit.message ?? notSupportedMessage
    };
  }
  const passed = versionAtLeast(detectedVersion, limit.minVersion);
  return {
    id, label, detected, status: passed ? 'ok' : 'failed', message: passed ? undefined : (limit.message ?? versionNotSupportedMessage)
  };
}

function evaluateBooleanCheck(
  id: CheckedRowId,
  label: string,
  detectedValue: boolean,
  valueYesText: string | undefined,
  valueNoText: string | undefined,
  isPassing: boolean,
  enabled: boolean | undefined,
  notSupportedMessage: string | undefined
): SystemInfoRow {
  const detected = detectedValue ? (valueYesText ?? '') : (valueNoText ?? '');
  if (!enabled) return { id, label, detected };
  return {
    id, label, detected, status: isPassing ? 'ok' : 'failed', message: isPassing ? undefined : notSupportedMessage
  };
}

@Component({
  selector: 'syscheck-player-system-check',
  imports: [CheckRow],
  templateUrl: 'system-check.html',
  styleUrl: 'system-check.scss'
})
export class SystemCheck {
  private readonly systemInfo = inject(SystemInfoService);

  viewParameters = input.required<SystemContextViewParameters>();
  messages = input<SystemCheckMessages>();

  readonly stateChanged = output<SystemCheckState>();
  readonly nextStep = output<void>();

  readonly expandedRows = signal<ReadonlySet<SystemCheckRowId>>(new Set());

  constructor() {
    effect(() => this.stateChanged.emit({
      browser: [toResponse('browser', this.browserRow().detected, this.browserRow().status === 'ok')],
      os: [toResponse('os', this.osRow().detected, this.osRow().status === 'ok')],
      resolution: [toResponse('resolution', this.resolutionRow().detected, this.resolutionRow().status === 'ok')],
      touch: [toResponse('touch', this.touchRow().detected, this.touchRow().status === 'ok')],
      webgl: [toResponse('webgl', this.webglRow().detected, this.webglRow().status === 'ok')]
    }));
  }

  toggleInstructions(id: SystemCheckRowId): void {
    const next = new Set(this.expandedRows());
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.expandedRows.set(next);
  }

  goToNextStep(): void {
    this.nextStep.emit();
  }

  readonly browserRow = computed<SystemInfoRow>(() => {
    const name = this.systemInfo.browserName;
    const version = this.systemInfo.browserVersion;
    const detected = `${name} ${version}`.trim();
    const config = this.viewParameters().browser;
    const messages = this.messages();
    const label = messages?.browser_label ?? '';
    if (!config?.enabled) return { id: 'browser', label, detected };
    const limit = config.limits.find(l => l.browser.toLowerCase() === name.toLowerCase());
    return evaluateNamedLimit('browser', label, detected, limit, version, messages?.browser_not_supported, messages?.browser_version_not_supported);
  });

  readonly osRow = computed<SystemInfoRow>(() => {
    const name = this.systemInfo.osName;
    const version = this.systemInfo.osVersion;
    const detected = `${name} ${version}`.trim();
    const config = this.viewParameters().os;
    const messages = this.messages();
    const label = messages?.os_label ?? '';
    if (!config?.enabled) return { id: 'os', label, detected };
    const limit = config.limits.find(l => l.os.toLowerCase() === name.toLowerCase());
    return evaluateNamedLimit('os', label, detected, limit, version, messages?.os_not_supported, messages?.os_version_not_supported);
  });

  readonly resolutionRow = computed<SystemInfoRow>(() => {
    const { width, height } = this.systemInfo.screenResolution;
    const detected = `${width} x ${height} Pixel`;
    const config = this.viewParameters().resolution;
    const label = this.messages()?.resolution_label ?? '';
    if (!config?.enabled) return { id: 'resolution', label, detected };
    const passed = config.limits.length === 0
      || config.limits.some(limit => width >= limit.width && height >= limit.height);
    return {
      id: 'resolution', label, detected, status: passed ? 'ok' : 'failed', message: passed ? undefined : this.messages()?.resolution_not_supported
    };
  });

  readonly touchRow = computed<SystemInfoRow>(() => {
    const hasTouch = this.systemInfo.hasTouch;
    const messages = this.messages();
    return evaluateBooleanCheck(
      'touch', messages?.touch_label ?? '', hasTouch, messages?.touch_value_yes, messages?.touch_value_no,
      !hasTouch, this.viewParameters().touch?.enabled, messages?.touch_not_supported
    );
  });

  readonly webglRow = computed<SystemInfoRow>(() => {
    const hasWebGL = this.systemInfo.hasWebGL;
    const messages = this.messages();
    return evaluateBooleanCheck(
      'webgl', messages?.webgl_label ?? '', hasWebGL, messages?.webgl_value_yes, messages?.webgl_value_no,
      hasWebGL, this.viewParameters().webgl?.enabled, messages?.webgl_not_supported
    );
  });

  readonly deviceTypeRow = computed<SystemInfoRow>(() => ({
    id: 'deviceType', label: this.messages()?.device_type_label ?? '', detected: this.systemInfo.deviceType
  }));

  readonly windowResolutionRow = computed<SystemInfoRow>(() => {
    const { width, height } = this.systemInfo.windowResolution();
    return { id: 'windowResolution', label: this.messages()?.window_resolution_label ?? '', detected: `${width} x ${height} Pixel` };
  });

  readonly rows = computed<SystemInfoRow[]>(() => [
    this.browserRow(),
    this.osRow(),
    this.resolutionRow(),
    this.touchRow(),
    this.webglRow(),
    this.deviceTypeRow(),
    this.windowResolutionRow()
  ]);

  readonly allPassed = computed<boolean>(
    () => this.rows().every(row => row.status !== 'failed')
  );

  readonly hasChecks = computed<boolean>(
    () => this.rows().some(row => row.status !== undefined)
  );

  readonly bannerLead = computed<string | undefined>(() => {
    if (!this.hasChecks()) return undefined;
    return this.allPassed() ? this.messages()?.success_lead : this.messages()?.error_lead;
  });

  readonly overallMessage = computed<string | undefined>(
    () => (this.allPassed() ? this.messages()?.success : this.messages()?.error)
  );
}
