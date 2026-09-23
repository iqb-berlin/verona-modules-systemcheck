export type viewTypes = 'WELCOME' | 'SYSTEM' | 'NETWORK' | 'REPORT';

export interface Unit {
  id: 'syscheck-unit-definition';
  version: string;
  viewType: viewTypes;
  viewParameters?: SystemContextViewParameters | NetworkViewParameters;
  messages?: SystemCheckMessages;
  textOverrides?: Record<Textoverrides, string>;
}

export interface SystemCheckMessages {
  title?: string;
  intro_text?: string;
  intro_scenarios?: string;
  intro_scenario_ok?: string;
  intro_scenario_error?: string;
  intro_note?: string;
  browser_label?: string;
  os_label?: string;
  resolution_label?: string;
  device_type_label?: string;
  window_resolution_label?: string;
  touch_label?: string;
  webgl_label?: string;
  touch_value_yes?: string;
  touch_value_no?: string;
  webgl_value_yes?: string;
  webgl_value_no?: string;
  success?: string;
  error?: string;
  success_lead?: string;
  error_lead?: string;
  os_not_supported?: string;
  browser_not_supported?: string;
  resolution_not_supported?: string;
  os_version_not_supported?: string;
  browser_version_not_supported?: string;
  touch_not_supported?: string;
  webgl_not_supported?: string;
  instructions_button?: string;
  next_step_button?: string;
}

export interface BrowserLimit {
  browser: string;
  minVersion?: string;
  message?: string;
}

export interface OsLimit {
  os: string;
  minVersion?: string;
  message?: string;
}

export interface ResolutionLimit {
  width: number;
  height: number;
  message?: string;
}

export interface BrowserCheckParameters {
  enabled: boolean;
  limits: BrowserLimit[];
}

export interface OsCheckParameters {
  enabled: boolean;
  limits: OsLimit[];
}

export interface ResolutionCheckParameters {
  enabled: boolean;
  limits: ResolutionLimit[];
}

export interface BooleanCheckParameters {
  enabled: boolean;
}

export interface SystemContextViewParameters {
  browser?: BrowserCheckParameters;
  os?: OsCheckParameters;
  resolution?: ResolutionCheckParameters;
  touch?: BooleanCheckParameters;
  webgl?: BooleanCheckParameters;
}

export interface SpeedCheckParameters {
  items?: number[];
  minSpeed: number;
  goodSpeed: number;
  maxDeviance: number;
  maxErrorPerSequence: number;
  maxSequenceRepetition: number;
  message?: string;
}

export interface DownloadCheckParameters extends SpeedCheckParameters {
  urlList?: string[];
  fileList?: string[];
}

export interface NetworkMessages {
  title?: string;
  measuring_download?: string;
  measuring_upload?: string;
  done?: string;
  download_label?: string;
  upload_label?: string;
  download_row_label?: string;
  upload_row_label?: string;
  success?: string;
  error?: string;
  slow?: string;
  success_lead?: string;
  error_lead?: string;
  slow_lead?: string;
  instructions_button?: string;
  next_step_button?: string;
}

export interface NetworkViewParameters {
  download?: DownloadCheckParameters;
  upload?: SpeedCheckParameters;
  messages?: NetworkMessages;
}

type Textoverrides = 'report_sendToMail';
