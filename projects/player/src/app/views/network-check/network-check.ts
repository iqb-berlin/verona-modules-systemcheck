import {
  Component, computed, inject, input, OnInit, signal
} from '@angular/core';

import { CheckRow, CheckRowStatus } from '../../components/check-row/check-row';
import { NetworkViewParameters, SpeedCheckParameters } from '../../interfaces/unit';
import { SpeedTestResult, SpeedTestService } from '../../services/speed-test.service';

export type SpeedRating = 'good' | 'ok' | 'insufficient';

export interface DirectionResult {
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

  readonly running = signal(false);
  readonly statusMessage = signal('');
  readonly downloadResult = signal<DirectionResult | undefined>(undefined);
  readonly uploadResult = signal<DirectionResult | undefined>(undefined);

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
    const messages = this.viewParameters().messages;
    if (rating === 'insufficient') return messages?.error;
    if (rating === 'ok') return messages?.slow;
    return messages?.success;
  });

  ngOnInit(): void {
    void this.startCheck();
  }

  private async startCheck(): Promise<void> {
    this.running.set(true);
    this.downloadResult.set(undefined);
    this.uploadResult.set(undefined);

    const download = this.viewParameters().download;
    if (download) {
      this.statusMessage.set('Measuring download speed…');
      this.downloadResult.set(await this.runDirection('Download', download, size => this.speedTest.benchmarkDownloadSize(this.apiBaseUrl(), size), download.urlList));
    }

    const upload = this.viewParameters().upload;
    if (upload) {
      this.statusMessage.set('Measuring upload speed…');
      this.uploadResult.set(await this.runDirection('Upload', upload, size => this.speedTest.benchmarkUpload(this.apiBaseUrl(), size)));
    }

    this.statusMessage.set('');
    this.running.set(false);
  }

  private apiBaseUrl(): string {
    return this.directDownloadUrl() ?? '';
  }

  private async runDirection(
    label: string,
    params: SpeedCheckParameters,
    benchmarkSize: (size: number) => Promise<SpeedTestResult>,
    urlList?: string[]
  ): Promise<DirectionResult> {
    let remainingUrls = urlList ?? [];
    const runSequence = async (): Promise<SpeedTestResult[]> => {
      const results: SpeedTestResult[] = [];
      // eslint-disable-next-line no-restricted-syntax
      for (const size of params.items) {
        // eslint-disable-next-line no-await-in-loop
        results.push(await benchmarkSize(size));
      }
      // urlList files are large, real-world samples - fetch them once (on the first sequence
      // round) rather than on every convergence repetition, to keep bandwidth/time bounded.
      // eslint-disable-next-line no-restricted-syntax
      for (const url of remainingUrls) {
        // eslint-disable-next-line no-await-in-loop
        results.push(await this.speedTest.benchmarkDownloadUrl(url));
      }
      remainingUrls = [];
      return results;
    };

    const result = await runConvergingSequences(runSequence, params);
    const rating: SpeedRating = result.unstable ? 'insufficient' : rate(result.averageBytesPerSecond, params);
    return {
      label,
      averageBytesPerSecond: result.averageBytesPerSecond,
      rating,
      status: statusOf(rating),
      message: rating === 'good' ? undefined : params.message
    };
  }
}
