import { Injectable } from '@angular/core';

export interface SpeedTestResult {
  size: number;
  durationMs: number;
  error: string | null;
}

const DOWNLOAD_TIMEOUT_MS = 45000;

function errorMessage(error: unknown): string {
  if (error instanceof DOMException && error.name === 'AbortError') return 'timeout';
  return error instanceof Error ? error.message : 'network error';
}

async function withTimeout<T>(timeoutMs: number, run: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await run(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

@Injectable({
  providedIn: 'root'
})
export class SpeedTestService {
  async benchmarkDownloadSize(apiBaseUrl: string, size: number): Promise<SpeedTestResult> {
    const start = performance.now();
    try {
      const response = await withTimeout(DOWNLOAD_TIMEOUT_MS, signal => fetch(
          `${apiBaseUrl}/speed-test/random-package/${size}`,
          {cache: 'no-store', signal}
      ));
      const body = await response.text();
      const durationMs = performance.now() - start;
      if (!response.ok) return {size: 0, durationMs, error: `HTTP ${response.status}`};
      if (body.length !== size) {
        return {size: 0, durationMs, error: `Unexpected package size: ${body.length} != ${size}`};
      }
      return {size, durationMs, error: null};
    } catch (error) {
      return {size: 0, durationMs: performance.now() - start, error: errorMessage(error)};
    }
  }

  async benchmarkDownloadUrl(url: string): Promise<SpeedTestResult> {
    const start = performance.now();
    console.log('download', url);
    try {
      const response = await withTimeout(DOWNLOAD_TIMEOUT_MS, signal => fetch(
          url,
          {cache: 'no-store', signal}
      ));
      const body = await response.arrayBuffer();
      const durationMs = performance.now() - start;
      console.log('time', durationMs);
      if (!response.ok) return {size: 0, durationMs, error: `HTTP ${response.status}`};
      return {size: body.byteLength, durationMs, error: null};
    } catch (error) {
      return {size: 0, durationMs: performance.now() - start, error: errorMessage(error)};
    }
  }
}
