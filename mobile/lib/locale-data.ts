import type { Language } from "@/lib/i18n";

const CATEGORY_NAMES_EN: Record<string, string> = {
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

const PRODUCT_CATEGORY_NAMES_AR: Record<string, string> = {
  fashion: "الأزياء والملابس",
  clothes: "الملابس",
  shoes: "الأحذية",
  bags: "الحقائب والإكسسوارات",
  electronics: "الإلكترونيات",
  phones: "الهواتف والأجهزة اللوحية",
  computers: "الحواسيب ومستلزماتها",
  gadgets: "الأجهزة الإلكترونية",
  "phone-accessories": "إكسسوارات الهواتف",
  beauty: "الجمال والعناية الشخصية",
  perfumes: "العطور",
  makeup: "مستحضرات التجميل",
  skincare: "العناية بالبشرة والشعر",
  home: "المنزل والديكور",
  furniture: "الأثاث",
  "home-tools": "الأدوات المنزلية",
  decor: "الديكور والإضاءة",
  kitchenware: "أدوات المطبخ",
  kids: "الأطفال والألعاب",
  "kids-clothes": "ملابس الأطفال",
  toys: "ألعاب الأطفال",
  "kids-essentials": "مستلزمات الأطفال",
  sports: "الرياضة والترفيه",
  sportswear: "الملابس والأحذية الرياضية",
  "sports-gear": "المعدات الرياضية",
  hobbies: "مستلزمات الهوايات",
  food: "الأغذية والحلويات",
  sweets: "الحلويات والمخبوزات",
  groceries: "المنتجات الغذائية",
  "home-food": "المأكولات المنزلية",
  "gifts-crafts": "الهدايا والحرف اليدوية",
  gifts: "الهدايا",
  handmade: "المنتجات اليدوية",
  stationery: "القرطاسية ومستلزمات المكتب",
  digital: "الخدمات والمشاريع الرقمية",
  design: "التصميم والجرافيك",
  "web-dev": "تطوير المواقع والتطبيقات",
  "digital-services": "الخدمات الرقمية",
  "digital-products": "المنتجات الرقمية",
  cars: "السيارات وملحقاتها",
  "car-accessories": "إكسسوارات السيارات",
  "car-parts": "قطع الغيار",
  "car-maintenance": "مستلزمات الصيانة",
  books: "الكتب والتعليم",
  industrial: "الأدوات المهنية والصناعية",
  used: "المنتجات المستعملة",
  flowers: "الزهور والنباتات",
  pets: "مستلزمات الحيوانات الأليفة",
  misc: "منتجات أخرى"
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
  return CATEGORY_NAMES_EN[id] ?? fallback;
}

export function getLocalizedProductCategoryLabel(id: string, language: Language): string {
  const normalizedId = id.trim();
  if (language === "ar") return PRODUCT_CATEGORY_NAMES_AR[normalizedId] ?? normalizedId;
  return CATEGORY_NAMES_EN[normalizedId] ?? normalizedId;
}
