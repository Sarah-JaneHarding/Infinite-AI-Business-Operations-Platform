import { describe, expect, it } from 'vitest';
import { checkTarget, isPrivateIp, parseAllowlist, sign } from '../src/server/outbound';

const allow = parseAllowlist('Hooks.Example.com, api.partner.co.za');
describe('outbound target check', () => {
  it('is off with an empty allowlist', () => expect(checkTarget('https://hooks.example.com/x', [])).toMatchObject({ ok: false }));
  it('accepts an allowed https host only', () => {
    expect(checkTarget('https://hooks.example.com/in', allow)).toMatchObject({ ok: true });
    expect(checkTarget('https://other.example.com/in', allow)).toMatchObject({ ok: false });
    expect(checkTarget('http://hooks.example.com/in', allow)).toMatchObject({ ok: false });
  });
  it('refuses tricks', () => {
    for (const u of ['https://user:pw@hooks.example.com/', 'https://hooks.example.com:8443/', 'https://127.0.0.1/', 'https://[::1]/', 'https://localhost/', 'https://hooks.example.com.evil.com/', 'https://evil.com/@hooks.example.com', 'not a url', 'https://169.254.169.254/latest']) expect(checkTarget(u, allow).ok, u).toBe(false);
  });
  it('treats private and special addresses as private', () => {
    for (const ip of ['10.0.0.1', '127.0.0.1', '169.254.169.254', '172.16.5.5', '192.168.1.1', '100.64.0.1', '0.0.0.0', '::1', 'fd00::1', 'fe80::1', '::ffff:10.0.0.1', 'garbage']) expect(isPrivateIp(ip), ip).toBe(true);
    for (const ip of ['8.8.8.8', '41.0.0.1', '2606:4700::1111']) expect(isPrivateIp(ip), ip).toBe(false);
  });
  it('signs the body', () => expect(sign('k', '{}')).toMatch(/^sha256=[0-9a-f]{64}$/));
});

import { integrations } from '../src/departments/integrations';
describe('integration registry', () => {
  it('never reports a connection that is not configured', () => {
    expect(integrations({ githubToken: false }, true).find((i) => i.id === 'github-read')?.state).toBe('off');
    expect(integrations({ outbound: true }, false).find((i) => i.id === 'outbound')?.state).toBe('off');
    expect(integrations({ outbound: true }, true).find((i) => i.id === 'outbound')?.state).toBe('live');
    for (const id of ['sso', 'messaging', 'payments']) expect(integrations({ llm: true, githubToken: true }, true).find((i) => i.id === id)?.state).toBe('not_built');
  });
});
