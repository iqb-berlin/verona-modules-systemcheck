export type viewTypes = 'WELCOME' | 'SYSTEM' | 'NETWORK' | 'REPORT';

export interface Unit {
  id: 'syscheck-unit-definition';
  version: string;
  viewType: viewTypes;
  viewParameters?: SystemContextViewParameters | NetworkViewParameters;
  textOverrides?: Record<Textoverrides, string>;
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
  message?: string;
}

export interface OsCheckParameters {
  enabled: boolean;
  limits: OsLimit[];
  message?: string;
}

export interface ResolutionCheckParameters {
  enabled: boolean;
  limits: ResolutionLimit[];
  message?: string;
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
