import { evaluateOs } from './system-evaluation';

describe('system evaluation', () => {
  const config = { os: { enabled: true, limits: [{ os: 'linux', minVersion: '1' }] } };
  const messages = { os_version_not_detected: 'not detected', os_version_not_supported: 'too old' };

  it('warns instead of failing when the version could not be detected', () => {
    expect(evaluateOs('Linux', '', config, messages)).toMatchObject({ status: 'warning', message: 'not detected' });
  });

  it('still rates a detected version', () => {
    expect(evaluateOs('Linux', '0.9', config, messages)).toMatchObject({ status: 'failed', message: 'too old' });
    expect(evaluateOs('Linux', '6.1', config, messages).status).toBe('ok');
  });
});
