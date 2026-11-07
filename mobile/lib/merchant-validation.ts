import { z } from "zod";

export const merchantStoreSchema = z.object({
  storeName: z.string().trim().min(2, "merchantValidationStoreName").max(100, "merchantValidationStoreName"),
  phone: z.string().trim().regex(/^[+0-9()\s-]{7,20}$/, "merchantValidationPhone"),
  whatsapp: z.string().trim().max(20, "merchantValidationWhatsApp").refine(
    (value) => value.length === 0 || /^[+0-9()\s-]{7,20}$/.test(value),
    "merchantValidationWhatsApp"
  ),
  wilayaId: z.number().int().positive().nullable().refine(
    (value) => value !== null,
    "merchantValidationWilaya"
  ),
  commune: z.string().trim().min(2, "merchantValidationCommune").max(80, "merchantValidationCommune"),
  addressLine: z.string().trim().min(4, "merchantValidationAddress").max(300, "merchantValidationAddress"),
  open: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "merchantValidationTime"),
  close: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "merchantValidationTime"),
  category: z.string().trim().min(1, "merchantValidationCategory"),
  subcategories: z.array(z.string().min(1)).max(30, "merchantValidationSubcategories")
}).superRefine((value, context) => {
  if (new Set(value.subcategories).size !== value.subcategories.length) {
    context.addIssue({
      code: "custom",
      path: ["subcategories"],
      message: "merchantValidationSubcategories"
    });
  }
});

export type MerchantStoreFormInput = z.input<typeof merchantStoreSchema>;
export type MerchantStoreFormValues = z.output<typeof merchantStoreSchema>;

export function createStoreSlug(storeName: string, suffix: string): string {
  const base = storeName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const safeSuffix = suffix.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8);
  return `${base || "store"}-${safeSuffix || "arownd"}`;
}

export function merchantStoreErrorKey(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const mappings: ReadonlyArray<readonly [string, string]> = [
    ["not_authenticated", "merchantErrorAuthentication"],
    ["profile_not_found", "merchantErrorProfile"],
    ["account_type_conflict", "merchantErrorAccountConflict"],
    ["store_already_exists", "merchantErrorStoreExists"],
    ["invalid_store_input", "merchantErrorInvalidInput"],
    ["invalid_store_category", "merchantErrorInvalidCategory"],
    ["invalid_store_subcategory", "merchantErrorInvalidCategory"],
    ["PGRST202", "merchantErrorUnavailable"],
    ["Could not find the function", "merchantErrorUnavailable"],
    ["23505", "merchantErrorStoreConflict"]
  ];

  return mappings.find(([code]) => message.includes(code))?.[1] ?? "merchantErrorGeneric";
}
