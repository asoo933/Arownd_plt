export interface NativeListenerHandle {
  remove(): Promise<void>;
}

/**
 * Registers an async native listener without leaking it when its owner unmounts
 * while the native bridge is still creating the listener.
 */
export async function addManagedNativeListener(
  create: () => Promise<NativeListenerHandle>,
  isDisposed: () => boolean,
  handles: NativeListenerHandle[],
): Promise<boolean> {
  const handle = await create();
  if (isDisposed()) {
    await handle.remove();
    return false;
  }
  handles.push(handle);
  return true;
}
