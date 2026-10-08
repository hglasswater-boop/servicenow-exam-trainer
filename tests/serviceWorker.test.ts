import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import vm from "node:vm";
import { describe, expect, it, vi } from "vitest";

type Listener = (event: any) => void;

function loadServiceWorker(options: {
  fetchImpl: (request: unknown) => Promise<any>;
  cachedResponse?: any;
}) {
  const listeners = new Map<string, Listener>();
  const cachePut = vi.fn().mockResolvedValue(undefined);
  const cache = { put: cachePut };
  const cacheMatch = vi.fn().mockResolvedValue(options.cachedResponse);
  const caches = {
    keys: vi.fn().mockResolvedValue([]),
    open: vi.fn().mockResolvedValue(cache),
    match: cacheMatch,
    delete: vi.fn().mockResolvedValue(true)
  };
  const self = {
    location: { origin: "https://trainer.example" },
    skipWaiting: vi.fn(),
    clients: { claim: vi.fn() },
    addEventListener: vi.fn((type: string, listener: Listener) => {
      listeners.set(type, listener);
    })
  };

  const source = readFileSync(resolve("public/sw.js"), "utf8");
  vm.runInNewContext(source, {
    self,
    caches,
    fetch: options.fetchImpl,
    URL,
    Promise
  });

  return { listeners, cachePut, cacheMatch, caches, self };
}

describe("service worker runtime strategy", () => {
  it("uses the network first and stores a successful same-origin response", async () => {
    const clone = { cached: true };
    const networkResponse = {
      ok: true,
      clone: vi.fn(() => clone)
    };
    const fetchImpl = vi.fn().mockResolvedValue(networkResponse);
    const runtime = loadServiceWorker({ fetchImpl });
    let responsePromise: Promise<any> | undefined;

    runtime.listeners.get("fetch")?.({
      request: {
        method: "GET",
        url: "https://trainer.example/exams/cis-df/questions.json"
      },
      respondWith: (promise: Promise<any>) => {
        responsePromise = promise;
      }
    });

    expect(await responsePromise).toBe(networkResponse);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(runtime.cachePut).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://trainer.example/exams/cis-df/questions.json"
      }),
      clone
    );
  });

  it("falls back to the cached response only when the network fails", async () => {
    const cachedResponse = { cached: true };
    const fetchImpl = vi.fn().mockRejectedValue(new Error("offline"));
    const runtime = loadServiceWorker({ fetchImpl, cachedResponse });
    let responsePromise: Promise<any> | undefined;

    runtime.listeners.get("fetch")?.({
      request: {
        method: "GET",
        url: "https://trainer.example/"
      },
      respondWith: (promise: Promise<any>) => {
        responsePromise = promise;
      }
    });

    expect(await responsePromise).toBe(cachedResponse);
    expect(runtime.cacheMatch).toHaveBeenCalledTimes(1);
  });

  it("does not intercept cross-origin requests", () => {
    const runtime = loadServiceWorker({
      fetchImpl: vi.fn().mockResolvedValue({ ok: true })
    });
    const respondWith = vi.fn();

    runtime.listeners.get("fetch")?.({
      request: {
        method: "GET",
        url: "https://other.example/data.json"
      },
      respondWith
    });

    expect(respondWith).not.toHaveBeenCalled();
  });
});
