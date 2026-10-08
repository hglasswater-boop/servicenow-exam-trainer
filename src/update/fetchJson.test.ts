import { describe, expect, it, vi } from "vitest";
import { fetchJson } from "./fetchJson";

describe("fetchJson", () => {
  it("bypasses the browser HTTP cache", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ value: 1 })
    });

    const result = await fetchJson<{ value: number }>("./data.json", fetcher);

    expect(fetcher).toHaveBeenCalledWith("./data.json", {
      cache: "no-store"
    });
    expect(result).toEqual({ value: 1 });
  });

  it("throws for non-success responses", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({})
    });

    await expect(fetchJson("./data.json", fetcher)).rejects.toThrow(
      "Failed to load ./data.json: 503"
    );
  });
});
