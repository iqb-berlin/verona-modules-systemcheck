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
  success?: string;
  error?: string;
  os_not_supported?: string;
  browser_not_supported?: string;
  resolution_not_supported?: string;
  os_version_not_supported?: string;
  browser_version_not_supported?: string;
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

export interface SystemContextViewParameters {
  browser?: BrowserCheckParameters;
  os?: OsCheckParameters;
  resolution?: ResolutionCheckParameters;
}

export interface SpeedCheckParameters {
  items: number[];
  minSpeed: number;
  goodSpeed: number;
  maxDeviance: number;
  maxErrorPerSequence: number;
  maxSequenceRepetition: number;
  message?: string;
}

export interface DownloadCheckParameters extends SpeedCheckParameters {
  urlList?: string[];
}

export interface NetworkMessages {
  success?: string;
  error?: string;
  slow?: string;
}

export interface NetworkViewParameters {
  download?: DownloadCheckParameters;
  upload?: SpeedCheckParameters;
  messages?: NetworkMessages;
}

type Textoverrides = 'report_sendToMail';
