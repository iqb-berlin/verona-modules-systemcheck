export type viewTypes = 'WELCOME' | 'SYSTEM' | 'NETWORK' | 'REPORT';

export interface Unit {
  id: 'syscheck-unit-definition';
  version: string;
  viewType: viewTypes;
  viewParameters?: SystemContextViewParameters | NetworkViewParameters | ReportViewParameters;
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
  os_version_not_detected?: string;
  browser_version_not_detected?: string;
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
  done?: string;
  download_label?: string;
  download_row_label?: string;
  success?: string;
  /** shown only when no connection was possible at all */
  error?: string;
  /** shown in the download row when no connection was possible at all; falls back to `error` */
  no_connection?: string;
  /** shown when the connection works, but is too slow or unstable; {min_speed} is replaced by the required speed */
  insufficient?: string;
  slow?: string;
  success_lead?: string;
  error_lead?: string;
  slow_lead?: string;
  instructions_button?: string;
  next_step_button?: string;
}

export interface NetworkViewParameters {
  download?: DownloadCheckParameters;
  messages?: NetworkMessages;
}

export interface ReportMessages extends SystemCheckMessages {
  system_section_title?: string;
  network_section_title?: string;
  window_resolution_label?: string;
  download_row_label?: string;
  download_desired_label?: string;
  download_slow?: string;
  /** {min_speed} is replaced by the required speed */
  download_insufficient?: string;
  download_no_connection?: string;
  missing_value?: string;
  note_lead?: string;
  note_text?: string;
  contact_email?: string;
  finish_button?: string;
  print_button?: string;
}

export interface ReportViewParameters {
  /** requirements to rate the shared system values against; use the same as in the SYSTEM unit */
  system?: SystemContextViewParameters;
  messages?: ReportMessages;
}

type Textoverrides = 'report_sendToMail';
