export type QuantityStepState = {
  canDecrease: boolean;
  canIncrease: boolean;
};

export function getQuantityStepState(value: number, min: number, max: number): QuantityStepState {
  return {
    canDecrease: value > min,
    canIncrease: value < max
  };
}
