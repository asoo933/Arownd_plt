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
let pendingRequest: CartFlyRequest | null = null;
const listeners = new Set<CartFlyListener>();

function notifyListeners(request: CartFlyRequest): void {
  listeners.forEach((listener) => listener(request));
}

export function registerCartFlyTarget(target: CartFlyTarget): () => void {
  cartTarget = target;
  if (pendingRequest && listeners.size > 0) {
    const request = pendingRequest;
    pendingRequest = null;
    notifyListeners(request);
  }
  return () => {
    if (cartTarget === target) cartTarget = null;
  };
}

export function getCartFlyTarget(): CartFlyTarget | null {
  return cartTarget;
}

export function subscribeCartFly(listener: CartFlyListener): () => void {
  listeners.add(listener);
  if (cartTarget && pendingRequest) {
    const request = pendingRequest;
    pendingRequest = null;
    listener(request);
  }
  return () => {
    listeners.delete(listener);
  };
}

export function emitCartFly(request: CartFlyRequest): void {
  if (!cartTarget || listeners.size === 0) {
    pendingRequest = request;
    return;
  }
  notifyListeners(request);
}
