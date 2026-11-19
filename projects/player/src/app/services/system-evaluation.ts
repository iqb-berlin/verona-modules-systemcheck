import { CheckRowStatus } from '../components/check-row/check-row';
import {
  BrowserLimit, OsLimit, SystemCheckMessages, SystemContextViewParameters
} from '../interfaces/unit';

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

/**
 * Rates detected system values against the requirements of a unit. Shared by the system check,
 * which rates live values, and the report, which rates the values received as shared parameters.
 */

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
  versionNotSupportedMessage: string | undefined,
  versionNotDetectedMessage: string | undefined
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
  // an undetectable version (e.g. Linux) can't be rated - warn instead of failing the check
  if (!detectedVersion) {
    return {
      id, label, detected, status: 'warning', message: versionNotDetectedMessage
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

export function formatResolution(width: number, height: number): string {
  return `${width} x ${height} Pixel`;
}

export function evaluateBrowser(
  name: string, version: string, config: SystemContextViewParameters, messages: SystemCheckMessages | undefined
): SystemInfoRow {
  const detected = `${name} ${version}`.trim();
  const label = messages?.browser_label ?? '';
  if (!config.browser?.enabled) return { id: 'browser', label, detected };
  const limit = config.browser.limits.find(l => l.browser.toLowerCase() === name.toLowerCase());
  return evaluateNamedLimit('browser', label, detected, limit, version, messages?.browser_not_supported, messages?.browser_version_not_supported, messages?.browser_version_not_detected);
}

export function evaluateOs(
  name: string, version: string, config: SystemContextViewParameters, messages: SystemCheckMessages | undefined
): SystemInfoRow {
  const detected = `${name} ${version}`.trim();
  const label = messages?.os_label ?? '';
  if (!config.os?.enabled) return { id: 'os', label, detected };
  const limit = config.os.limits.find(l => l.os.toLowerCase() === name.toLowerCase());
  return evaluateNamedLimit('os', label, detected, limit, version, messages?.os_not_supported, messages?.os_version_not_supported, messages?.os_version_not_detected);
}

export function evaluateResolution(
  width: number, height: number, config: SystemContextViewParameters, messages: SystemCheckMessages | undefined
): SystemInfoRow {
  const detected = formatResolution(width, height);
  const label = messages?.resolution_label ?? '';
  if (!config.resolution?.enabled) return { id: 'resolution', label, detected };
  const passed = config.resolution.limits.length === 0
    || config.resolution.limits.some(limit => width >= limit.width && height >= limit.height);
  return {
    id: 'resolution', label, detected, status: passed ? 'ok' : 'failed', message: passed ? undefined : messages?.resolution_not_supported
  };
}

export function evaluateTouch(
  hasTouch: boolean, config: SystemContextViewParameters, messages: SystemCheckMessages | undefined
): SystemInfoRow {
  return evaluateBooleanCheck(
    'touch', messages?.touch_label ?? '', hasTouch, messages?.touch_value_yes, messages?.touch_value_no,
    !hasTouch, config.touch?.enabled, messages?.touch_not_supported
  );
}

export function evaluateWebgl(
  hasWebGL: boolean, config: SystemContextViewParameters, messages: SystemCheckMessages | undefined
): SystemInfoRow {
  return evaluateBooleanCheck(
    'webgl', messages?.webgl_label ?? '', hasWebGL, messages?.webgl_value_yes, messages?.webgl_value_no,
    hasWebGL, config.webgl?.enabled, messages?.webgl_not_supported
  );
}
