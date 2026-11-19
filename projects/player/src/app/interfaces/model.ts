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

export function toSharedParameters(values: Partial<Record<SharedParameterKey, string | boolean>>): SharedParameter[] {
  return Object.entries(values).map(([key, value]) => ({ key, value: String(value) }));
}
