export type MerchantAccessStatus =
  | "signed_out"
  | "personal"
  | "merchant_setup_required"
  | "merchant_ready"
  | "delivery_company"
  | "inconsistent";

export type MerchantAccessInput = {
  accountType: "personal" | "merchant" | "delivery_company";
  roles: readonly string[];
  hasOwnedStore: boolean;
};

export function resolveMerchantAccessStatus(input: MerchantAccessInput): MerchantAccessStatus {
  const hasMerchantRole = input.roles.includes("merchant");
  const hasDeliveryRole = input.roles.includes("delivery_company");

  if (input.accountType === "delivery_company" || hasDeliveryRole) {
    return hasMerchantRole || input.hasOwnedStore ? "inconsistent" : "delivery_company";
  }

  if (input.accountType === "merchant" && hasMerchantRole && input.hasOwnedStore) {
    return "merchant_ready";
  }

  if (input.accountType === "merchant" && hasMerchantRole && !input.hasOwnedStore) {
    return "merchant_setup_required";
  }

  if (input.accountType === "personal" && !hasMerchantRole && !input.hasOwnedStore) {
    return "personal";
  }

  return "inconsistent";
}
