import {
  Component, computed, effect, inject, input, output, signal
} from '@angular/core';
import { Response } from '@iqbspecs/response/response.interface';

import { CheckRow } from '../../components/check-row/check-row';
import { SystemCheckMessages, SystemContextViewParameters } from '../../interfaces/unit';
import { SystemInfoService } from '../../services/system-info.service';
import {
  CheckedRowId, evaluateBrowser, evaluateOs, evaluateResolution, evaluateTouch, evaluateWebgl,
  formatResolution, SystemCheckRowId, SystemInfoRow
} from '../../services/system-evaluation';
import { CheckState, toResponse, toSharedParameters } from '../../interfaces/model';

export type SystemCheckState = Record<CheckedRowId, Response[]>;

/** 'ok' | 'warning' | 'failed', or 'unchecked' when no requirement is configured for the row */
function toRating(row: SystemInfoRow): string {
  return row.status ?? 'unchecked';
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

  readonly stateChanged = output<CheckState>();
  readonly nextStep = output<void>();

  readonly expandedRows = signal<ReadonlySet<SystemCheckRowId>>(new Set());

  constructor() {
    effect(() => {
      const screen = this.systemInfo.screenResolution;
      const windowSize = this.systemInfo.windowResolution();
      this.stateChanged.emit({
        dataParts: {
          browser: [toResponse('browser', this.browserRow().detected, this.browserRow().status === 'ok')],
          os: [toResponse('os', this.osRow().detected, this.osRow().status === 'ok')],
          resolution: [toResponse('resolution', this.resolutionRow().detected, this.resolutionRow().status === 'ok')],
          touch: [toResponse('touch', this.touchRow().detected, this.touchRow().status === 'ok')],
          webgl: [toResponse('webgl', this.webglRow().detected, this.webglRow().status === 'ok')]
        } satisfies SystemCheckState,
        sharedParameters: toSharedParameters({
          os_label: this.systemInfo.osName,
          os_version: this.systemInfo.osVersion,
          resolution: `${screen.width}x${screen.height}`,
          browser_label: this.systemInfo.browserName,
          browser_version: this.systemInfo.browserVersion,
          window_resolution: `${windowSize.width}x${windowSize.height}`,
          webgl: this.hasWebGL,
          touchdevice: this.systemInfo.hasTouch,
          os_rating: toRating(this.osRow()),
          browser_rating: toRating(this.browserRow()),
          resolution_rating: toRating(this.resolutionRow())
        })
      });
    });
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

  readonly browserRow = computed<SystemInfoRow>(() => evaluateBrowser(
    this.systemInfo.browserName, this.systemInfo.browserVersion, this.viewParameters(), this.messages()
  ));

  readonly osRow = computed<SystemInfoRow>(() => evaluateOs(
    this.systemInfo.osName, this.systemInfo.osVersion, this.viewParameters(), this.messages()
  ));

  readonly resolutionRow = computed<SystemInfoRow>(() => {
    const { width, height } = this.systemInfo.screenResolution;
    return evaluateResolution(width, height, this.viewParameters(), this.messages());
  });

  readonly touchRow = computed<SystemInfoRow>(
    () => evaluateTouch(this.systemInfo.hasTouch, this.viewParameters(), this.messages())
  );

  private readonly hasWebGL = this.systemInfo.hasWebGL;

  readonly webglRow = computed<SystemInfoRow>(
    () => evaluateWebgl(this.hasWebGL, this.viewParameters(), this.messages())
  );

  readonly deviceTypeRow = computed<SystemInfoRow>(() => ({
    id: 'deviceType', label: this.messages()?.device_type_label ?? '', detected: this.systemInfo.deviceType
  }));

  readonly windowResolutionRow = computed<SystemInfoRow>(() => {
    const { width, height } = this.systemInfo.windowResolution();
    return { id: 'windowResolution', label: this.messages()?.window_resolution_label ?? '', detected: formatResolution(width, height) };
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
