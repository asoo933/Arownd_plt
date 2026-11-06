export interface PushRegistrationGate {
  begin(): boolean;
  markRequested(): void;
  markFailed(): void;
}

/**
 * Prevents duplicate native registration calls while allowing retries after
 * permission denial, plugin errors, or server-side token registration errors.
 */
export function createPushRegistrationGate(): PushRegistrationGate {
  let requested = false;
  let inFlight = false;

  return {
    begin() {
      if (requested || inFlight) return false;
      inFlight = true;
      return true;
    },
    markRequested() {
      requested = true;
      inFlight = false;
    },
    markFailed() {
      requested = false;
      inFlight = false;
    },
  };
}
