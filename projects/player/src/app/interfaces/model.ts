import { Response } from '@iqbspecs/response/response.interface';

import { SharedParameter } from '../../../../verona/verona.interfaces';

/** Variable IDs of the shared parameters, as listed in variables_syscheck.xlsx */
export type SharedParameterKey =
  'os_label' | 'os_version' | 'resolution' | 'browser_label' | 'browser_version' | 'window_resolution' |
  'download_kbit_actual' | 'download_kbit_desired' | 'download_rating' | 'webgl' | 'touchdevice' |
  'os_rating' | 'browser_rating' | 'resolution_rating';

export interface CheckState {
  dataParts: Record<string, Response[]>;
  sharedParameters: SharedParameter[];
}

/** a coded response of a check row, scored 1 when the row passed without restrictions */
export function toResponse(id: string, value: string, ok: boolean): Response {
  return {
    id, status: 'CODING_COMPLETE', value, score: ok ? 1 : 0
  };
}

export function toSharedParameters(values: Partial<Record<SharedParameterKey, string | boolean>>): SharedParameter[] {
  return Object.entries(values).map(([key, value]) => ({ key, value: String(value) }));
}
