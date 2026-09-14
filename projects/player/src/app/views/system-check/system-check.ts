import { Component, computed, inject, input } from '@angular/core';

import { CheckRow, CheckRowStatus } from '../../components/check-row/check-row';
import { BrowserLimit, OsLimit, SystemContextViewParameters } from '../../interfaces/unit';
import { SystemInfoService } from '../../services/system-info.service';

export interface SystemInfoRow {
  label: string;
  detected: string;
  /** undefined = informational only, no requirement configured for this row */
  status?: CheckRowStatus;
  message?: string;
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
  label: string,
  detected: string,
  detectedName: string,
  detectedVersion: string,
  limit: BrowserLimit | OsLimit | undefined,
  checkMessage: string | undefined
): SystemInfoRow {
  if (!limit) {
    return {
      label, detected, status: 'warning', message: `${detectedName} is not on the list of checked ${label.toLowerCase()}s; compatibility cannot be verified.`
    };
  }
  if (!limit.minVersion) {
    return {
      label, detected, status: 'warning', message: limit.message ?? `No minimum version configured for ${detectedName}; compatibility cannot be verified.`
    };
  }
  const passed = versionAtLeast(detectedVersion, limit.minVersion);
  return {
    label, detected, status: passed ? 'ok' : 'failed', message: passed ? undefined : (limit.message ?? checkMessage)
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

  readonly browserRow = computed<SystemInfoRow>(() => {
    const name = this.systemInfo.browserName;
    const version = this.systemInfo.browserVersion;
    const detected = `${name} ${version}`.trim();
    const config = this.viewParameters().browser;
    if (!config?.enabled) return { label: 'Browser', detected };
    const limit = config.limits.find(l => l.browser.toLowerCase() === name.toLowerCase());
    return evaluateNamedLimit('Browser', detected, name, version, limit, config.message);
  });

  readonly osRow = computed<SystemInfoRow>(() => {
    const name = this.systemInfo.osName;
    const version = this.systemInfo.osVersion;
    const detected = `${name} ${version}`.trim();
    const config = this.viewParameters().os;
    if (!config?.enabled) return { label: 'Operating system', detected };
    const limit = config.limits.find(l => l.os.toLowerCase() === name.toLowerCase());
    return evaluateNamedLimit('Operating system', detected, name, version, limit, config.message);
  });

  readonly resolutionRow = computed<SystemInfoRow>(() => {
    const { width, height } = this.systemInfo.screenResolution;
    const detected = `${width} × ${height}`;
    const config = this.viewParameters().resolution;
    if (!config?.enabled) return { label: 'Screen resolution', detected };
    const passed = config.limits.length === 0
      || config.limits.some(limit => width >= limit.width && height >= limit.height);
    return {
      label: 'Screen resolution', detected, status: passed ? 'ok' : 'failed', message: passed ? undefined : config.message
    };
  });

  readonly deviceTypeRow = computed<SystemInfoRow>(() => ({
    label: 'Device type',
    detected: this.systemInfo.deviceType
  }));

  readonly windowResolutionRow = computed<SystemInfoRow>(() => {
    const { width, height } = this.systemInfo.windowResolution();
    return { label: 'Window resolution', detected: `${width} × ${height}` };
  });

  readonly rows = computed<SystemInfoRow[]>(() => [
    this.browserRow(),
    this.osRow(),
    this.deviceTypeRow(),
    this.resolutionRow(),
    this.windowResolutionRow()
  ]);

  readonly allPassed = computed<boolean>(
    () => this.rows().every(row => row.status !== 'failed')
  );

  readonly hasChecks = computed<boolean>(
    () => this.rows().some(row => row.status !== undefined)
  );
}
