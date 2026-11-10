export type CartFlyRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type CartFlyTarget = {
  measure: (onMeasured: (rect: CartFlyRect) => void) => void;
  onArrive: () => void;
};

export type CartFlyRequest = {
  source: CartFlyRect;
  imageUri: string | null;
};

type CartFlyListener = (request: CartFlyRequest) => void;

let cartTarget: CartFlyTarget | null = null;
const pendingRequests: CartFlyRequest[] = [];
const listeners = new Set<CartFlyListener>();

function notifyListeners(request: CartFlyRequest): void {
  listeners.forEach((listener) => listener(request));
}

function flushPendingRequests(): void {
  if (!cartTarget || listeners.size === 0) return;

  while (pendingRequests.length > 0) {
    const request = pendingRequests.shift();
    if (request) notifyListeners(request);
  }
}

export function registerCartFlyTarget(target: CartFlyTarget): () => void {
  cartTarget = target;
  flushPendingRequests();

  return () => {
    if (cartTarget === target) cartTarget = null;
  };
}

export function getCartFlyTarget(): CartFlyTarget | null {
  return cartTarget;
}

export function subscribeCartFly(listener: CartFlyListener): () => void {
  listeners.add(listener);
  flushPendingRequests();

  return () => {
    listeners.delete(listener);
  };
}

export function emitCartFly(request: CartFlyRequest): void {
  if (!cartTarget || listeners.size === 0) {
    pendingRequests.push(request);
    return;
  }

  notifyListeners(request);
}
