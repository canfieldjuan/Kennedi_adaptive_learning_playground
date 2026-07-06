/**
 * Session management.
 * Generates session IDs and tracks session time.
 */

/**
 * Generate a simple unique session ID.
 */
export function createSessionId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `sess-${timestamp}-${random}`;
}

/**
 * Session timer that tracks elapsed time and can enforce limits.
 */
export class SessionTimer {
  private _startTime: number = 0;
  private _limitMs: number;
  private _onLimitReached: (() => void) | null = null;
  private _intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(limitMinutes: number = 20) {
    this._limitMs = limitMinutes * 60 * 1000;
  }

  start(): void {
    this._startTime = Date.now();
    this._intervalId = setInterval(() => {
      if (this.elapsedMs() >= this._limitMs) {
        this._onLimitReached?.();
        this.stop();
      }
    }, 10_000); // Check every 10 seconds
  }

  stop(): void {
    if (this._intervalId !== null) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
  }

  elapsedMs(): number {
    if (this._startTime === 0) return 0;
    return Date.now() - this._startTime;
  }

  elapsedMinutes(): number {
    return Math.floor(this.elapsedMs() / 60_000);
  }

  onLimitReached(handler: () => void): void {
    this._onLimitReached = handler;
  }
}
