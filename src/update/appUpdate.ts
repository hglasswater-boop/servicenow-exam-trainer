export interface UpdateRegistration {
  update(): Promise<unknown>;
}

export interface ServiceWorkerContainerLike {
  register(
    scriptUrl: string,
    options: { updateViaCache: "none" }
  ): Promise<UpdateRegistration>;
  addEventListener(type: string, listener: () => void): void;
}

export async function enableAutoUpdate(
  serviceWorker: ServiceWorkerContainerLike,
  reload: () => void
): Promise<void> {
  let reloading = false;

  serviceWorker.addEventListener("controllerchange", () => {
    if (reloading) {
      return;
    }
    reloading = true;
    reload();
  });

  const registration = await serviceWorker.register("./sw.js", {
    updateViaCache: "none"
  });

  await registration.update();
}
