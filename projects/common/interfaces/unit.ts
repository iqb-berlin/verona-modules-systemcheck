export interface Unit {
  type: 'syscheck-unit-definition';
  version: string;
  view: WelcomeView | SystemContextView | NetworkView | ReportView;
  textOverrides?: Record<Textoverrides, string>;
}

export interface WelcomeView {
  viewType: 'welcome'
}

export interface SystemContextView {
  viewType: 'systemContext';
  viewParameters: SystemContextViewParameters;
}

export interface NetworkView {
  viewType: 'network';
  viewParameters: NetworkViewParameters;
}

export interface ReportView {
  viewType: 'report';
}

export interface SystemContextViewParameters {
  browser: boolean;
  os: boolean;
  resolution: boolean;
  microphone: boolean;
  cookies: boolean;
  plugins: boolean;
  language: boolean;
  timeDeviation: boolean;
  timeZone: boolean;
}

export interface NetworkViewParameters {
  downloadThreshold?: number;
  uploadThreshold?: number;
}

type Textoverrides = 'report_sendToMail';
