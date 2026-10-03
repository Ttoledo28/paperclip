import { describe, expect, it } from "vitest";
import {
  SIGTERM_EXIT_CODE,
  isSameUtcMinute,
  isServerShutdownRaceAdapterExit,
  shouldRetryServerShutdownRace,
} from "./server-shutdown-race.js";

describe("server shutdown race classification", () => {
  it("treats exit 143 with no signal as the drain race signature", () => {
    expect(
      isServerShutdownRaceAdapterExit({ exitCode: SIGTERM_EXIT_CODE, signal: null }),
    ).toBe(true);
    expect(
      isServerShutdownRaceAdapterExit({ exitCode: SIGTERM_EXIT_CODE, signal: undefined }),
    ).toBe(true);
    expect(
      isServerShutdownRaceAdapterExit({ exitCode: SIGTERM_EXIT_CODE, signal: "" }),
    ).toBe(true);
    expect(
      isServerShutdownRaceAdapterExit({ exitCode: SIGTERM_EXIT_CODE, signal: "SIGTERM" }),
    ).toBe(false);
    expect(isServerShutdownRaceAdapterExit({ exitCode: 1, signal: null })).toBe(false);
  });

  it("matches the OLL-350 same-UTC-minute window", () => {
    expect(
      isSameUtcMinute(
        new Date("2026-10-03T23:17:05.000Z"),
        new Date("2026-10-03T23:17:59.999Z"),
      ),
    ).toBe(true);
    expect(
      isSameUtcMinute(
        new Date("2026-10-03T23:17:05.000Z"),
        new Date("2026-10-03T23:18:00.000Z"),
      ),
    ).toBe(false);
  });

  it("retries when shutdown is in progress even without a recorded timestamp", () => {
    expect(
      shouldRetryServerShutdownRace({
        exitCode: SIGTERM_EXIT_CODE,
        signal: null,
        shutdownInProgress: true,
        finishedAt: new Date("2026-10-03T23:17:10.000Z"),
        shutdownStartedAt: null,
      }),
    ).toBe(true);
  });

  it("retries adapter_failed-shaped exits when shutdown shares the same UTC minute", () => {
    expect(
      shouldRetryServerShutdownRace({
        exitCode: SIGTERM_EXIT_CODE,
        signal: null,
        shutdownInProgress: false,
        finishedAt: new Date("2026-10-03T23:17:54.000Z"),
        shutdownStartedAt: new Date("2026-10-03T23:17:42.000Z"),
      }),
    ).toBe(true);
  });

  it("does not retry a lone 143 outside the shutdown window", () => {
    expect(
      shouldRetryServerShutdownRace({
        exitCode: SIGTERM_EXIT_CODE,
        signal: null,
        shutdownInProgress: false,
        finishedAt: new Date("2026-10-03T23:20:00.000Z"),
        shutdownStartedAt: new Date("2026-10-03T23:17:42.000Z"),
      }),
    ).toBe(false);
  });
});
