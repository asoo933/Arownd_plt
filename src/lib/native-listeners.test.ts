import { describe, expect, it, vi } from "vitest";
import { addManagedNativeListener, type NativeListenerHandle } from "./native-listeners";

describe("addManagedNativeListener", () => {
  it("stores a listener while its owner is active", async () => {
    const handle: NativeListenerHandle = { remove: vi.fn(async () => undefined) };
    const handles: NativeListenerHandle[] = [];

    const added = await addManagedNativeListener(
      async () => handle,
      () => false,
      handles,
    );

    expect(added).toBe(true);
    expect(handles).toEqual([handle]);
    expect(handle.remove).not.toHaveBeenCalled();
  });

  it("immediately removes a listener created after its owner was disposed", async () => {
    const handle: NativeListenerHandle = { remove: vi.fn(async () => undefined) };
    const handles: NativeListenerHandle[] = [];

    const added = await addManagedNativeListener(
      async () => handle,
      () => true,
      handles,
    );

    expect(added).toBe(false);
    expect(handles).toHaveLength(0);
    expect(handle.remove).toHaveBeenCalledOnce();
  });
});
