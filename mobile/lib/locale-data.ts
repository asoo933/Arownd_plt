import type { Language } from "@/lib/i18n";

const MERCHANT_CATEGORY_NAMES_EN: Record<string, string> = {
  fashion: "Fashion & Clothing",
  clothes: "Clothing",
  shoes: "Shoes",
  bags: "Bags & Accessories",
  electronics: "Electronics",
  phones: "Phones & Tablets",
  computers: "Computers & Accessories",
  gadgets: "Electronic Gadgets",
  "phone-accessories": "Phone Accessories",
  beauty: "Beauty & Personal Care",
  perfumes: "Perfumes",
  makeup: "Makeup",
  skincare: "Skincare & Hair Care",
  home: "Home & Decor",
  furniture: "Furniture",
  "home-tools": "Household Items",
  decor: "Decor & Lighting",
  kitchenware: "Kitchenware",
  kids: "Kids & Toys",
  "kids-clothes": "Kids' Clothing",
  toys: "Toys",
  "kids-essentials": "Baby Essentials",
  sports: "Sports & Recreation",
  sportswear: "Sportswear & Shoes",
  "sports-gear": "Sports Equipment",
  hobbies: "Hobby Supplies",
  food: "Food & Sweets",
  sweets: "Sweets & Bakery",
  groceries: "Groceries",
  "home-food": "Homemade Food",
  "gifts-crafts": "Gifts & Handicrafts",
  gifts: "Gifts",
  handmade: "Handmade Products",
  stationery: "Stationery & Office Supplies",
  digital: "Digital Services & Projects",
  design: "Design & Graphics",
  "web-dev": "Website & App Development",
  "digital-services": "Digital Services",
  "digital-products": "Digital Products",
  cars: "Cars & Accessories",
  "car-accessories": "Car Accessories",
  "car-parts": "Spare Parts",
  "car-maintenance": "Maintenance Supplies",
  books: "Books & Education",
  industrial: "Professional & Industrial Tools",
  used: "Second-hand Products",
  flowers: "Flowers & Plants",
  pets: "Pet Supplies",
  misc: "Other Products"
};

export function getLocalizedWilayaLabel(_id: number, fallback: string, language: Language, nameFr?: string | null): string {
  if (language === "ar") return fallback;
  return nameFr?.trim() || fallback;
}

export function getLocalizedMerchantCategoryLabel(
  id: string,
  fallback: string,
  language: Language
): string {
  if (language === "ar") return fallback;
  return MERCHANT_CATEGORY_NAMES_EN[id] ?? fallback;
}
