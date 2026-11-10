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
const listeners = new Set<CartFlyListener>();

export function registerCartFlyTarget(target: CartFlyTarget): () => void {
  cartTarget = target;
  return () => {
    if (cartTarget === target) cartTarget = null;
  };
}

export function getCartFlyTarget(): CartFlyTarget | null {
  return cartTarget;
}

export function subscribeCartFly(listener: CartFlyListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitCartFly(request: CartFlyRequest): void {
  listeners.forEach((listener) => listener(request));
}
