/** 128 + 15 (SIGTERM). Child exited after SIGTERM without a tracked kill signal. */
export const SIGTERM_EXIT_CODE = 143;

/**
 * Adapter lost the graceful-drain race: the CLI process died with exit 143 and
 * no `signal` was recorded. Paperclip-owned kills persist `signal=SIGTERM` and
 * `exitCode=null`; the race leaves the inverse.
 */
export function isServerShutdownRaceAdapterExit(input: {
  exitCode: number | null | undefined;
  signal: string | null | undefined;
}): boolean {
  if (input.exitCode !== SIGTERM_EXIT_CODE) return false;
  const signal = typeof input.signal === "string" ? input.signal.trim() : input.signal;
  return signal == null || signal === "";
}

/** Same UTC calendar minute, matching the OLL-350 evidence window. */
export function isSameUtcMinute(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate() &&
    a.getUTCHours() === b.getUTCHours() &&
    a.getUTCMinutes() === b.getUTCMinutes()
  );
}

/**
 * Exit 143 / no signal enters the `server_shutdown_interrupted` retry path when
 * shutdown is in progress or a shutdown was recorded in the same UTC minute.
 */
export function shouldRetryServerShutdownRace(input: {
  exitCode: number | null | undefined;
  signal: string | null | undefined;
  shutdownInProgress: boolean;
  finishedAt: Date;
  shutdownStartedAt: Date | null | undefined;
}): boolean {
  if (!isServerShutdownRaceAdapterExit(input)) return false;
  if (input.shutdownInProgress) return true;
  if (!input.shutdownStartedAt) return false;
  return isSameUtcMinute(input.finishedAt, input.shutdownStartedAt);
}
