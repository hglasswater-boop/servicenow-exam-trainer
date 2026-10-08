import { describe, expect, it, vi } from "vitest";
import { enableAutoUpdate } from "./appUpdate";

describe("enableAutoUpdate", () => {
  it("registers the service worker without HTTP cache and checks for updates", async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    const register = vi.fn().mockResolvedValue({ update });
    const addEventListener = vi.fn();

    await enableAutoUpdate(
      { register, addEventListener },
      vi.fn()
    );

    expect(register).toHaveBeenCalledWith("./sw.js", {
      updateViaCache: "none"
    });
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("reloads only once when the active service worker changes", async () => {
    const listeners = new Map<string, () => void>();
    const container = {
      register: vi.fn().mockResolvedValue({
        update: vi.fn().mockResolvedValue(undefined)
      }),
      addEventListener: vi.fn((type: string, listener: () => void) => {
        listeners.set(type, listener);
      })
    };
    const reload = vi.fn();

    await enableAutoUpdate(container, reload);

    listeners.get("controllerchange")?.();
    listeners.get("controllerchange")?.();

    expect(reload).toHaveBeenCalledTimes(1);
  });
});
