export function shouldEnableServiceWorker(
  isNative: boolean,
  hasServiceWorker: boolean
): boolean {
  return !isNative && hasServiceWorker;
}
