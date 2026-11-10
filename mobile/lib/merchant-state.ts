export type MerchantAccessStatus =
  | "signed_out"
  | "personal"
  | "merchant_setup_required"
  | "merchant_ready"
  | "inconsistent";

export type MerchantAccessInput = {
  accountType: "personal" | "merchant";
  roles: readonly string[];
  hasOwnedStore: boolean;
};

export function resolveMerchantAccessStatus(input: MerchantAccessInput): Exclude<MerchantAccessStatus, "signed_out"> {
  const hasMerchantRole = input.roles.includes("merchant");
  if (input.accountType === "merchant" && hasMerchantRole && input.hasOwnedStore) return "merchant_ready";
  if (input.accountType === "merchant" && hasMerchantRole && !input.hasOwnedStore) return "merchant_setup_required";
  if (input.accountType === "personal" && !hasMerchantRole && !input.hasOwnedStore) return "personal";
  return "inconsistent";
}
