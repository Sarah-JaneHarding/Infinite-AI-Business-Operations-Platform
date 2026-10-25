/** Sliding-window limiter: at most `max` calls per `windowMs` for each key. */
export class RateLimiter {
  private calls = new Map<string, number[]>();
  constructor(private max = 20, private windowMs = 60_000, private now: () => number = Date.now) {}
  allow(key: string): boolean {
    const t = this.now();
    const recent = (this.calls.get(key) ?? []).filter((x) => t - x < this.windowMs);
    if (recent.length >= this.max) {
      this.calls.set(key, recent);
      return false;
    }
    this.calls.set(key, [...recent, t]);
    return true;
  }
}
