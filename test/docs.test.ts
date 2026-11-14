import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (p: string): string => readFileSync(p, 'utf8');

describe('documentation and repository policy files', () => {
  it('.env.example names the signing keys with empty values', () => {
    const env = read('.env.example');
    for (const key of ['OPS_SIGNERS', 'OPS_SIGNING_MODE', 'OPS_SOLO_WAIT_MINUTES']) {
      expect(env).toMatch(new RegExp(`^${key}=$`, 'm'));
    }
  });
  it('CODEOWNERS exists and names the owner', () => {
    expect(existsSync('.github/CODEOWNERS')).toBe(true);
    expect(read('.github/CODEOWNERS')).toContain('@Sarah-JaneHarding');
  });
  it('PR_POLICY.md exists and requires draft pull requests', () => {
    expect(existsSync('docs/PR_POLICY.md')).toBe(true);
    expect(read('docs/PR_POLICY.md')).toMatch(/draft/i);
  });
  it('REVIEW_BOARD.md documents solo signing, two-person and professional review', () => {
    const doc = read('docs/REVIEW_BOARD.md');
    for (const term of ['OPS_SIGNING_MODE', 'twoPerson', 'professionalReview']) expect(doc).toContain(term);
  });
});
