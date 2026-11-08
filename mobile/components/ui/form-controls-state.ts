export type QuantityStepState = {
  canDecrease: boolean;
  canIncrease: boolean;
};

export function getQuantityStepState(value: number, min: number, max: number): QuantityStepState {
  const validRange =
    Number.isFinite(value) &&
    Number.isFinite(min) &&
    Number.isFinite(max) &&
    min <= max &&
    value >= min &&
    value <= max;

  if (!validRange) {
    return { canDecrease: false, canIncrease: false };
  }

  return {
    canDecrease: value > min,
    canIncrease: value < max
  };
}
