export interface JsonResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}

export type JsonFetcher = (
  url: string,
  init: { cache: "no-store" }
) => Promise<JsonResponse>;

const browserFetcher: JsonFetcher = (url, init) => fetch(url, init);

export async function fetchJson<T>(
  url: string,
  fetcher: JsonFetcher = browserFetcher
): Promise<T> {
  const response = await fetcher(url, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${response.status}`);
  }

  return (await response.json()) as T;
}
