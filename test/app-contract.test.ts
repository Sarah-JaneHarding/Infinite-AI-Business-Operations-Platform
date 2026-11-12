import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * The UI has no component test harness, and a UI rework once silently dropped the sign-in screen: with OPS_USERS set the
 * app hung on "Starting the platform…" and nobody could sign in. This pins the pieces the authenticated mode depends on.
 */
describe('App shell keeps what authenticated mode needs', () => {
  const app = readFileSync('src/App.tsx', 'utf8');
  it('shows a sign-in screen when the server wants a token, and sends it to signIn', () => {
    expect(app).toMatch(/if \(authNeeded\) return/);
    expect(app).toMatch(/aria-label="Access token"/);
    expect(app).toMatch(/signIn\(token\)/);
  });
  it('takes the identity from the server instead of asking for a name when auth is on', () => {
    expect(app).toMatch(/health\?\.auth !== 'users'/);
  });
  it('tells the user when the server refused to save something', () => {
    expect(app).toMatch(/syncError &&/);
  });
  it('offers the erasure view', () => {
    expect(app).toMatch(/name: 'erasure'/);
    expect(app).toMatch(/<ErasureView \/>/);
  });
  it('offers Autonomous Agents', () => {
    expect(app).toMatch(/name: 'autonomy'/);
    expect(app).toMatch(/<Autonomy \/>/);
  });
  it('offers the Review Board', () => {
    expect(app).toMatch(/name: 'board'/);
    expect(app).toMatch(/<Board \/>/);
  });
  it('offers the Model Hub', () => {
    expect(app).toMatch(/name: 'models'/);
    expect(app).toMatch(/<ModelHub \/>/);
  });
});
