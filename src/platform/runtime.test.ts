import { describe, expect, it } from "vitest";
import { shouldEnableServiceWorker } from "./runtime";

describe("shouldEnableServiceWorker", () => {
  it("enables it only for web environments that support service workers", () => {
    expect(shouldEnableServiceWorker(false, true)).toBe(true);
    expect(shouldEnableServiceWorker(false, false)).toBe(false);
    expect(shouldEnableServiceWorker(true, true)).toBe(false);
  });
});
