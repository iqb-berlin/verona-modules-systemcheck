import {
  Component, computed, input, output, signal
} from '@angular/core';

import { CheckRow, CheckRowStatus } from '../../components/check-row/check-row';
import { ReportMessages, ReportViewParameters } from '../../interfaces/unit';
import { SharedParameterKey } from '../../interfaces/model';
import {
  evaluateBrowser, evaluateOs, evaluateResolution, evaluateTouch, evaluateWebgl, formatResolution
} from '../../services/system-evaluation';
import { SharedParameter } from '../../../../../verona/verona.interfaces';
import { withMinSpeed } from '../network-check/network-check';

export type ReportSectionId = 'system' | 'network';

export interface ReportRow {
  id: string;
  label: string;
  detected: string;
  status?: CheckRowStatus;
  message?: string;
  showIcon?: boolean;
}

export interface ReportSection {
  id: ReportSectionId;
  title: string;
  rows: ReportRow[];
  hasIssue: boolean;
}

function parseResolution(value: string): { width: number; height: number } | undefined {
  const match = /^(\d+)x(\d+)$/.exec(value);
  return match ? { width: Number(match[1]), height: Number(match[2]) } : undefined;
}

function kbitToMbit(kbit: string): string {
  return (Number(kbit) / 1000).toFixed(2);
}

function hasIssue(rows: ReportRow[]): boolean {
  return rows.some(row => row.status === 'failed' || row.status === 'warning');
}

@Component({
  selector: 'syscheck-player-report',
  imports: [CheckRow],
  templateUrl: 'report.html',
  styleUrl: 'report.scss'
})
export class Report {
  viewParameters = input.required<ReportViewParameters>();
  sharedParameters = input<SharedParameter[]>([]);

  readonly finish = output<void>();

  readonly expandedSections = signal<ReadonlySet<ReportSectionId>>(new Set(['system', 'network']));
  readonly expandedRows = signal<ReadonlySet<string>>(new Set());

  readonly messages = computed<ReportMessages | undefined>(() => this.viewParameters().messages);

  private readonly values = computed<Partial<Record<SharedParameterKey, string>>>(() => Object.fromEntries(
    this.sharedParameters().map(parameter => [parameter.key, parameter.value ?? ''])
  ));

  private missing(id: string, label: string | undefined): ReportRow {
    return { id, label: label ?? '', detected: this.messages()?.missing_value ?? '–' };
  }

  readonly systemRows = computed<ReportRow[]>(() => {
    const values = this.values();
    const config = this.viewParameters().system ?? {};
    const messages = this.messages();
    const rows: ReportRow[] = [];

    rows.push(values.browser_label !== undefined
      ? evaluateBrowser(values.browser_label, values.browser_version ?? '', config, messages)
      : this.missing('browser', messages?.browser_label));
    rows.push(values.os_label !== undefined
      ? evaluateOs(values.os_label, values.os_version ?? '', config, messages)
      : this.missing('os', messages?.os_label));

    const screen = parseResolution(values.resolution ?? '');
    rows.push(screen
      ? evaluateResolution(screen.width, screen.height, config, messages)
      : this.missing('resolution', messages?.resolution_label));
    const windowSize = parseResolution(values.window_resolution ?? '');
    rows.push(windowSize
      ? { id: 'windowResolution', label: messages?.window_resolution_label ?? '', detected: formatResolution(windowSize.width, windowSize.height) }
      : this.missing('windowResolution', messages?.window_resolution_label));

    rows.push(values.touchdevice !== undefined
      ? { ...evaluateTouch(values.touchdevice === 'true', config, messages), showIcon: false }
      : this.missing('touch', messages?.touch_label));
    rows.push(values.webgl !== undefined
      ? { ...evaluateWebgl(values.webgl === 'true', config, messages), showIcon: false }
      : this.missing('webgl', messages?.webgl_label));
    return rows;
  });

  readonly networkRows = computed<ReportRow[]>(() => {
    const values = this.values();
    const messages = this.messages();
    const rows: ReportRow[] = [];

    if (values.download_kbit_actual !== undefined) {
      const rating = values.download_rating;
      let status: CheckRowStatus | undefined;
      let message: string | undefined;
      if (rating === 'good') status = 'ok';
      if (rating === 'ok') { status = 'warning'; message = messages?.download_slow; }
      if (rating === 'insufficient') {
        status = 'failed';
        message = values.download_kbit_desired === undefined
          ? messages?.download_insufficient
          : withMinSpeed(messages?.download_insufficient, kbitToMbit(values.download_kbit_desired));
      }
      if (rating === 'no_connection') { status = 'failed'; message = messages?.download_no_connection; }
      rows.push({
        id: 'download',
        label: messages?.download_row_label ?? '',
        detected: `∅ ${kbitToMbit(values.download_kbit_actual)} Mbit/s`,
        status,
        message
      });
    } else {
      rows.push(this.missing('download', messages?.download_row_label));
    }
    if (values.download_kbit_desired !== undefined) {
      rows.push({
        id: 'downloadDesired',
        label: messages?.download_desired_label ?? '',
        detected: `${kbitToMbit(values.download_kbit_desired)} Mbit/s`
      });
    }
    return rows;
  });

  readonly sections = computed<ReportSection[]>(() => [
    {
      id: 'system', title: this.messages()?.system_section_title ?? '', rows: this.systemRows(), hasIssue: hasIssue(this.systemRows())
    },
    {
      id: 'network', title: this.messages()?.network_section_title ?? '', rows: this.networkRows(), hasIssue: hasIssue(this.networkRows())
    }
  ]);

  readonly allRows = computed(() => [...this.systemRows(), ...this.networkRows()]);

  readonly hasChecks = computed(() => this.allRows().some(row => row.status !== undefined));

  readonly allPassed = computed(() => this.allRows().every(row => row.status !== 'failed'));

  readonly bannerLead = computed<string | undefined>(
    () => (this.allPassed() ? this.messages()?.success_lead : this.messages()?.error_lead)
  );

  readonly overallMessage = computed<string | undefined>(
    () => (this.allPassed() ? this.messages()?.success : this.messages()?.error)
  );

  toggleSection(id: ReportSectionId): void {
    this.expandedSections.set(Report.toggled(this.expandedSections(), id));
  }

  toggleInstructions(id: string): void {
    this.expandedRows.set(Report.toggled(this.expandedRows(), id));
  }

  // eslint-disable-next-line class-methods-use-this
  print(): void {
    window.print();
  }

  private static toggled<T>(set: ReadonlySet<T>, id: T): ReadonlySet<T> {
    const next = new Set(set);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    return next;
  }
}
