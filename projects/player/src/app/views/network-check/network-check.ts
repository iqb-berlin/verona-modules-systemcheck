import {
  Component, computed, inject, input, OnInit, output, signal
} from '@angular/core';

import { CheckRow, CheckRowStatus } from '../../components/check-row/check-row';
import { NetworkViewParameters, SpeedCheckParameters } from '../../interfaces/unit';
import { SpeedTestResult, SpeedTestService } from '../../services/speed-test.service';

export type SpeedRating = 'good' | 'ok' | 'insufficient';

export interface DirectionResult {
  id: 'download' | 'upload';
  label: string;
  averageBytesPerSecond: number;
  rating: SpeedRating;
  status: CheckRowStatus;
  message?: string;
}

function averageBytesPerSecond(results: SpeedTestResult[]): number {
  return results.reduce((sum, r) => sum + (r.size / (r.durationMs / 1000)), 0) / results.length;
}

async function runConvergingSequences(
  runSequence: () => Promise<SpeedTestResult[]>,
  params: Pick<SpeedCheckParameters, 'maxErrorPerSequence' | 'maxSequenceRepetition' | 'maxDeviance'>
): Promise<{ averageBytesPerSecond: number; unstable: boolean }> {
  const sequenceAverages: number[] = [];
  for (;;) {
    const averageOfPreviousLoops = sequenceAverages.length
      ? sequenceAverages.reduce((a, b) => a + b, 0) / sequenceAverages.length
      : NaN;
    // eslint-disable-next-line no-await-in-loop
    const results = await runSequence();
    const errors = results.filter(r => r.error !== null).length;
    const sequenceAverage = averageBytesPerSecond(results);
    if (errors > params.maxErrorPerSequence) {
      return { averageBytesPerSecond: sequenceAverage, unstable: true };
    }
    sequenceAverages.push(sequenceAverage);
    if (sequenceAverages.length > params.maxSequenceRepetition) break;
    if (sequenceAverages.length < 3 || Math.abs(averageOfPreviousLoops - sequenceAverage) > params.maxDeviance) continue;
    break;
  }
  return {
    averageBytesPerSecond: sequenceAverages.reduce((a, b) => a + b, 0) / sequenceAverages.length,
    unstable: false
  };
}

function rate(bytesPerSecond: number, params: SpeedCheckParameters): SpeedRating {
  if (bytesPerSecond < params.minSpeed) return 'insufficient';
  if (bytesPerSecond < params.goodSpeed) return 'ok';
  return 'good';
}

function statusOf(rating: SpeedRating): CheckRowStatus {
  if (rating === 'good') return 'ok';
  if (rating === 'ok') return 'warning';
  return 'failed';
}

export function toMbit(bytesPerSecond: number): string {
  return ((bytesPerSecond * 8) / 1_000_000).toFixed(2);
}

@Component({
  selector: 'syscheck-player-network-check',
  imports: [CheckRow],
  templateUrl: 'network-check.html',
  styleUrl: 'network-check.scss'
})
export class NetworkCheck implements OnInit {
  private readonly speedTest = inject(SpeedTestService);

  viewParameters = input.required<NetworkViewParameters>();
  directDownloadUrl = input<string>();

  readonly nextStep = output<void>();

  readonly running = signal(false);
  readonly statusMessage = signal('');
  readonly downloadResult = signal<DirectionResult | undefined>(undefined);
  readonly uploadResult = signal<DirectionResult | undefined>(undefined);
  readonly expandedRows = signal<ReadonlySet<string>>(new Set());

  readonly messages = computed(() => this.viewParameters().messages);

  readonly rows = computed<DirectionResult[]>(
    () => [this.downloadResult(), this.uploadResult()].filter((r): r is DirectionResult => !!r)
  );

  readonly overallRating = computed<SpeedRating | undefined>(() => {
    const ratings = this.rows().map(r => r.rating);
    if (ratings.length === 0) return undefined;
    if (ratings.includes('insufficient')) return 'insufficient';
    if (ratings.includes('ok')) return 'ok';
    return 'good';
  });

  readonly overallMessage = computed<string | undefined>(() => {
    const rating = this.overallRating();
    if (!rating) return undefined;
    const messages = this.messages();
    if (rating === 'insufficient') return messages?.error;
    if (rating === 'ok') return messages?.slow;
    return messages?.success;
  });

  readonly bannerLead = computed<string | undefined>(() => {
    const messages = this.messages();
    switch (this.overallRating()) {
      case 'insufficient': return messages?.error_lead;
      case 'ok': return messages?.slow_lead;
      case 'good': return messages?.success_lead;
      default: return undefined;
    }
  });

  ngOnInit(): void {
    void this.startCheck();
  }

  toggleInstructions(id: string): void {
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

  // eslint-disable-next-line class-methods-use-this
  formatMbit(bytesPerSecond: number): string {
    return toMbit(bytesPerSecond);
  }

  private async startCheck(): Promise<void> {
    this.running.set(true);
    this.downloadResult.set(undefined);
    this.uploadResult.set(undefined);

    const messages = this.messages();

    const download = this.viewParameters().download;
    if (download) {
      this.statusMessage.set(messages?.measuring_download ?? '');
      // fileList entries are resource IDs (filenames) resolved against the host-provided
      // directDownloadUrl, per the Verona spec's directDownloadUrl + "/" + resourceId convention.
      const resolvedFiles = (download.fileList ?? [])
        .map(fileName => `${this.apiBaseUrl()}/${encodeURIComponent(fileName)}`);
      const extraUrls = [...(download.urlList ?? []), ...resolvedFiles];
      this.downloadResult.set(await this.runDirection('download', messages?.download_row_label ?? '', download, size => this.speedTest.benchmarkDownloadSize(this.apiBaseUrl(), size), extraUrls));
    }

    const upload = this.viewParameters().upload;
    if (upload) {
      this.statusMessage.set(messages?.measuring_upload ?? '');
      this.uploadResult.set(await this.runDirection('upload', messages?.upload_row_label ?? '', upload, size => this.speedTest.benchmarkUpload(this.apiBaseUrl(), size)));
    }

    this.statusMessage.set(messages?.done ?? '');
    this.running.set(false);
  }

  private apiBaseUrl(): string {
    // For test purposes: when the player isn't embedded in a real testcenter host
    // (no directDownloadUrl provided), fall back to the public iqb-testcenter5.de
    // instance so the speed test can still be exercised, e.g. during local development.
    return this.directDownloadUrl() || 'https://iqb-testcenter5.de/api';
  }

  private async runDirection(
    id: 'download' | 'upload',
    label: string,
    params: SpeedCheckParameters,
    benchmarkSize: (size: number) => Promise<SpeedTestResult>,
    extraUrls?: string[]
  ): Promise<DirectionResult> {
    let remainingUrls = extraUrls ?? [];
    const runSequence = async (): Promise<SpeedTestResult[]> => {
      const results: SpeedTestResult[] = [];
      // eslint-disable-next-line no-restricted-syntax
      for (const size of params.items ?? []) {
        // eslint-disable-next-line no-await-in-loop
        results.push(await benchmarkSize(size));
      }
      // eslint-disable-next-line no-restricted-syntax
      for (const url of remainingUrls) {
        // eslint-disable-next-line no-await-in-loop
        results.push(await this.speedTest.benchmarkDownloadUrl(url));
      }
      // urlList/fileList entries are large, real-world samples - once `items` already provides
      // repeatable per-round data, fetch them just once rather than on every convergence round,
      // to keep bandwidth/time bounded. Without `items`, they're the only data source, so keep
      // fetching them every round - otherwise later rounds would have nothing to measure at all.
      if ((params.items?.length ?? 0) > 0) {
        remainingUrls = [];
      }
      return results;
    };

    const result = await runConvergingSequences(runSequence, params);
    const rating: SpeedRating = result.unstable ? 'insufficient' : rate(result.averageBytesPerSecond, params);
    return {
      id,
      label,
      averageBytesPerSecond: result.averageBytesPerSecond,
      rating,
      status: statusOf(rating),
      message: rating === 'good' ? undefined : params.message
    };
  }
}
