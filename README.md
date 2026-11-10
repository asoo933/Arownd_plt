# Arownd | منصة أراوند

<p align="center">
  <strong>Local Commerce. Connected.</strong><br/>
  <strong>تجارة محلية، متصلة في مكان واحد.</strong>
</p>

<p align="center">
  <em>An Arabic-first, Algeria-focused, multi-store shopping marketplace built as a native mobile application.</em><br/>
  <em>منصة تسوّق متعددة المتاجر، موجّهة للسوق الجزائري، وتعطي الأولوية للغة العربية، مبنية كتطبيق هاتف أصلي.</em>
</p>

---

## 🌍 About Arownd | عن أراوند

**EN** — Arownd connects customers with local stores through one mobile marketplace. Customers can discover stores and products, compare offers from different merchants, add items to a cart, choose home delivery or store pickup, place orders, and follow their progress. Merchants can establish a storefront, publish product offers, manage prices and inventory, and process customer orders.

**AR** — أراوند منصة تجمع العملاء بالمتاجر المحلية من خلال تطبيق واحد. يستطيع العميل اكتشاف المتاجر والمنتجات، ومقارنة عروض التجار، وإضافة المنتجات إلى السلة، واختيار التوصيل إلى المنزل أو الاستلام من المتجر، وإرسال الطلبات ومتابعة حالتها. ويستطيع التاجر إنشاء متجره وإدارة عروض المنتجات والأسعار والمخزون ومعالجة طلبات العملاء.

**Current product direction | التوجّه التقني الحالي:** Native-first. The active mobile client lives in `mobile/` and is built with Expo and React Native. The former React web client and its Capacitor wrapper are not part of the active application.

التطبيق المعتمد حالياً هو تطبيق هاتف أصلي مبني باستخدام Expo وReact Native داخل المجلد `mobile/`. واجهة React Web القديمة وغلاف Capacitor لم يعودا جزءاً من التطبيق النشط.

> **Scope note | تنبيه حول نطاق التوثيق:** This README documents the implementation and repository configuration that have been inspected. A migration file in Git does not prove that the corresponding change exists in the live Supabase database. Production readiness and external integrations must be verified independently.
>
> يوثّق هذا الملف ما تمت مراجعته من التطبيق وإعدادات المستودع. وجود Migration داخل Git لا يعني بالضرورة أن التغيير مطبّق في قاعدة Supabase الحية. يجب التحقق بشكل مستقل من جاهزية الإنتاج والتكاملات الخارجية.

---

## 📚 Contents | الفهرس

- [Product overview | نظرة عامة](#-product-overview--نظرة-عامة)
- [User experiences | تجارب الاستخدام](#-user-experiences--تجارب-الاستخدام)
- [Order lifecycle | دورة الطلب](#-order-delivery-and-payment--الطلب-والتوصيل-والدفع)
- [Screens and routes | الشاشات والمسارات](#-application-screens--الشاشات-والمسارات)
- [Architecture | المعمارية](#-system-architecture--معمارية-النظام)
- [Technology stack | التقنيات](#-technology-stack--التقنيات)
- [Repository structure | بنية المستودع](#-repository-structure--بنية-المستودع)
- [Data and Supabase | البيانات وSupabase](#-data-model-and-supabase--البيانات)
- [Local development | التشغيل المحلي](#-local-development--التطوير-المحلي)
- [Security | الأمان](#-environment-and-security--الإعدادات-والأمان)
- [CI and quality | الجودة والبناء الآلي](#-quality-and-automation--الجودة-والأتمتة)
- [Android builds | بناء Android](#-android-build-and-distribution--بناء-وتوزيع-أندرويد)
- [Known considerations | ملاحظات التكامل والإصدار](#-known-integration-considerations--ملاحظات-التكامل)
- [Development conventions | معايير التطوير](#-development-conventions--معايير-التطوير)

---

## 🛍️ Product overview | نظرة عامة على المنتج

### Product model | نموذج المنصة

**EN**
- **One marketplace:** customers browse stores and products from a unified mobile experience.
- **Merchant-specific offers:** the same product may have offers from multiple stores. Each store offer can have its own price, stock, availability, images, and options.
- **Two account journeys:** personal customer accounts and business/merchant accounts.
- **Multi-store order model:** a customer order can be split into merchant-specific orders so each store can process its own items.
- **Local delivery context:** checkout supports Algerian wilayas and communes, home delivery, and store pickup. Prices are represented in Algerian dinars (DZD).
- **Native application:** navigation, authentication callbacks, media selection, persisted client state, and Android/iOS configuration are implemented with Expo and React Native.

**AR**
- **سوق موحّد:** يتصفح العميل المتاجر والمنتجات من تجربة هاتف واحدة.
- **عروض خاصة بكل تاجر:** يمكن أن يتوفر المنتج نفسه لدى عدة متاجر، ولكل عرض سعره ومخزونه وحالة توفره وصوره وخياراته.
- **مساران للحسابات:** حساب شخصي للعميل وحساب تجاري للتاجر.
- **طلبات متعددة المتاجر:** يمكن تقسيم طلب العميل إلى طلبات فرعية مرتبطة بكل تاجر، حتى يعالج كل متجر المنتجات التابعة له.
- **ملاءمة السوق المحلي:** يدعم مسار الطلب الولايات والبلديات الجزائرية والتوصيل المنزلي والاستلام من المتجر، مع عرض الأسعار بالدينار الجزائري.
- **تطبيق أصلي:** تم بناء التنقل وتدفقات المصادقة واختيار الوسائط وحفظ حالة العميل وإعدادات Android وiOS باستخدام Expo وReact Native.

| Role / الدور | Responsibility / المسؤولية | Main workspace / مساحة العمل |
|---|---|---|
| Customer / العميل | Discover, compare, order, and track purchases. / اكتشاف المنتجات ومقارنتها وطلبها ومتابعتها. | Marketplace and account screens / واجهات السوق والحساب |
| Merchant / التاجر | Operate a store, manage offers and inventory, and fulfill orders. / إدارة المتجر والعروض والمخزون والطلبات. | Merchant workspace / مساحة التاجر |

## 👥 User experiences | تجارب الاستخدام

### Customer experience | تجربة العميل

1. **Authentication and account access | التسجيل والدخول**
   - **EN:** Personal registration, email/password sign-in, email confirmation through a native deep link, password recovery, and persisted Supabase Auth sessions.
   - **AR:** إنشاء حساب شخصي، وتسجيل الدخول بالبريد وكلمة المرور، وتأكيد البريد عبر رابط يفتح التطبيق، واستعادة كلمة المرور، والاحتفاظ بجلسة المصادقة على الجهاز.

2. **Marketplace discovery | اكتشاف السوق**
   - **EN:** Home feed, recently added available offers, featured verified stores, category browsing, text/category search, store profiles, and product details.
   - **AR:** الصفحة الرئيسية، والعروض المتاحة المضافة حديثاً، والمتاجر المميزة والموثقة، وتصفح التصنيفات، والبحث النصي وبحسب التصنيف، وصفحات المتاجر وتفاصيل المنتجات.

3. **Product and offer selection | اختيار المنتج والعرض**
   - **EN:** Compare offers for the same product across stores; inspect price, availability, and stock; choose supported options such as size or color; select quantity; and add a store-specific offer to the cart. Products and stores can be saved to favorites.
   - **AR:** مقارنة عروض المنتج نفسه بين المتاجر، ومراجعة السعر والتوفر والمخزون، واختيار الخيارات المدعومة مثل المقاس أو اللون، وتحديد الكمية، ثم إضافة عرض متجر محدد إلى السلة. كما يمكن حفظ المنتجات والمتاجر في المفضلة.

4. **Cart and checkout | السلة وإتمام الطلب**
   - **EN:** Review cart items grouped by store, update quantities, remove items, and revalidate offer price, availability, and stock before submission. The checkout flow supports saved or newly entered delivery details and home delivery or store pickup. Submission uses a Supabase checkout RPC and a client-persisted idempotency key to help prevent duplicate requests.
   - **AR:** مراجعة عناصر السلة مجمّعة حسب المتجر، وتعديل الكميات أو حذف العناصر، وإعادة التحقق من السعر والتوفر والمخزون قبل الإرسال. يدعم إتمام الطلب بيانات توصيل محفوظة أو جديدة، مع الاختيار بين التوصيل المنزلي والاستلام من المتجر. يُرسل الطلب عبر دالة Checkout في Supabase مع مفتاح idempotency محفوظ على الجهاز للمساعدة في منع تكرار الإرسال.

5. **Orders and after-sales | الطلبات وما بعد الشراء**
   - **EN:** Browse and filter orders, inspect order details and merchant suborders, follow status/tracking updates, receive updates through Supabase Realtime and periodic refresh, respond to applicable shipping quotes, and cancel orders or eligible suborders when permitted by their state.
   - **AR:** تصفح الطلبات وتصفيتها، وعرض تفاصيل الطلب والطلبات الفرعية الخاصة بالتجار، ومتابعة الحالة والتتبع، واستقبال التحديثات عبر Supabase Realtime والتحديث الدوري، والرد على عروض التوصيل عند الحاجة، وإلغاء الطلب أو الطلب الفرعي عندما تسمح حالته بذلك.

6. **Account and preferences | الحساب والتفضيلات**
   - **EN:** Profile and activity summary, delivery/contact details, saved addresses, favorites, notifications, submitted reviews, mark-as-read actions, system/light/dark appearance, password update, and sign-out.
   - **AR:** الملف الشخصي وملخص النشاط، وبيانات الاتصال والتوصيل والعناوين المحفوظة، والمفضلة والإشعارات والتقييمات، وتعليم الإشعارات كمقروءة، واختيار مظهر النظام أو الفاتح أو الداكن، وتحديث كلمة المرور وتسجيل الخروج.

### Merchant experience | تجربة التاجر

1. **Merchant onboarding | تهيئة المتجر**
   - **EN:** Business accounts can complete store setup with store name, contact phone, WhatsApp contact, location, address, business category/subcategories, and opening/closing times. Merchant access checks account and store readiness.
   - **AR:** يستطيع صاحب الحساب التجاري إعداد متجره بإدخال الاسم ورقم الاتصال وواتساب والموقع والعنوان والتصنيف الرئيسي والفرعي وأوقات العمل. ويتحقق قسم التاجر من جاهزية الحساب والمتجر قبل إتاحة وظائف الإدارة.

2. **Storefront management | إدارة واجهة المتجر**
   - **EN:** View the merchant dashboard, edit store details and location, configure opening hours and closed weekdays, and upload or replace the logo and cover image.
   - **AR:** عرض لوحة التاجر، وتعديل بيانات المتجر وموقعه، وضبط ساعات العمل وأيام الإغلاق، ورفع شعار المتجر وصورة الغلاف أو استبدالهما.

3. **Products and inventory | المنتجات والمخزون**
   - **EN:** Create offers with product information, category, brand, description, price, and stock; select images from the device; define supported size/color options; edit price and quantity; search/filter inventory; identify low/out-of-stock items; and control offer visibility.
   - **AR:** إنشاء عروض تتضمن معلومات المنتج والتصنيف والعلامة والوصف والسعر والكمية، واختيار الصور من الجهاز، وتحديد خيارات المقاس واللون المدعومة، وتعديل السعر والمخزون، والبحث والتصفية، ومعرفة المنتجات منخفضة أو منعدمة المخزون، والتحكم في ظهور العرض.

4. **Order operations | معالجة الطلبات**
   - **EN:** View incoming and historical orders, filter by status, inspect customer/items/delivery/payment details, accept or reject eligible orders, handle merchant-managed delivery quotes, progress fulfillment/tracking states, and record eligible cash-on-delivery collection for completed store-pickup orders.
   - **AR:** عرض الطلبات الجديدة والسابقة وتصفيتها حسب الحالة، ومراجعة بيانات العميل والمنتجات والتوصيل والدفع، وقبول الطلبات أو رفضها وفق شروطها، ومعالجة عروض التوصيل التي يديرها التاجر، وتحديث مراحل التجهيز والتتبع، وتسجيل تحصيل الدفع عند الاستلام للطلبات المؤهلة المكتملة بالاستلام من المتجر.

5. **Store analytics | إحصائيات المتجر**
   - **EN:** The merchant analytics screen presents order counts, delivered/active/cancelled orders, delivered revenue, average delivered order value, product count, low-stock/out-of-stock counts, and a seven-day delivered-revenue trend.
   - **AR:** تعرض شاشة الإحصائيات أعداد الطلبات والمسلّم منها والنشط والملغى، وإيرادات الطلبات المسلّمة ومتوسط قيمة الطلب المسلّم، وعدد المنتجات ومنخفضة المخزون والمنتهية، واتجاه الإيرادات المسلّمة خلال آخر سبعة أيام.

Merchant routes are guarded by account/store readiness. A business user without a configured store is directed to onboarding before accessing operational screens.

تخضع مسارات التاجر للتحقق من جاهزية الحساب والمتجر. ويُوجّه صاحب الحساب التجاري الذي لم يُكمل إعداد متجره إلى شاشة التهيئة قبل الوصول إلى شاشات الإدارة.

## 📦 Order, delivery and payment | الطلب والتوصيل والدفع

| Area / المجال | Current behavior / السلوك الحالي |
|---|---|
| Home delivery / التوصيل المنزلي | Customer provides wilaya, commune, and address details. Merchant-managed delivery may require a shipping quote and customer approval. / يحدد العميل الولاية والبلدية والعنوان، وقد يتطلب التوصيل الذي يديره التاجر عرض سعر وموافقة العميل. |
| Store pickup / الاستلام من المتجر | Customer selects pickup; the merchant progresses the fulfillment/pickup state. / يختار العميل الاستلام من المتجر ويتابع التاجر حالة التجهيز والاستلام. |
| Payment / الدفع | Native checkout currently submits `cod` (cash on delivery). / يرسل مسار الدفع الحالي في التطبيق طريقة `cod` أي الدفع عند الاستلام. |
| COD collection / تحصيل الدفع عند الاستلام | Merchant UI exposes a collection action for eligible completed store-pickup orders and records the collection through a database operation. / تتيح واجهة التاجر تسجيل التحصيل للطلبات المؤهلة المكتملة بالاستلام من المتجر عبر عملية في قاعدة البيانات. |
| Order states / حالات الطلب | UI handles states including pending, quoted, confirmed, shipped, delivered, cancelled, and rejected, alongside delivery-specific tracking states. / تتعامل الواجهة مع حالات مثل قيد الانتظار، وعرض سعر، ومؤكد، ومشحون، ومسلّم، وملغى، ومرفوض، إضافة إلى حالات التتبع المرتبطة بالتوصيل. |
| Multi-store / تعدد المتاجر | A parent customer order can contain merchant-specific suborders, each with its own store, items, status, and shipping fee. / يمكن أن يحتوي طلب العميل الرئيسي على طلبات فرعية لكل تاجر، ولكل منها متجرها وعناصرها وحالتها ورسوم توصيلها. |

> **Payment limitation | حدود الدفع:** The current native checkout explicitly sends `_payment_method: "cod"`. The inspected implementation does not demonstrate a completed online card processor or BaridiMob payment integration. Wallet-related database objects alone are not evidence that these payment methods are available.
>
> يرسل مسار إتمام الطلب الحالي صراحةً `_payment_method: "cod"`. ولا يثبت التنفيذ الذي تمت مراجعته وجود بوابة دفع إلكتروني بالبطاقات أو تكامل مكتمل مع بريدي موب. وجود جداول أو عناصر مرتبطة بالمحفظة في قاعدة البيانات لا يعني أن هذه الوسائل متاحة فعلياً.

## 📱 Application screens | شاشات التطبيق

Expo Router maps files under `mobile/app/` to application routes. يربط Expo Router الملفات داخل `mobile/app/` بمسارات التطبيق.

| Route / المسار | Purpose / الوظيفة |
|---|---|
| `/` | Resolve session and redirect / التحقق من الجلسة والتوجيه |
| `/login`, `/account-type` | Sign-in and account journey / الدخول واختيار نوع الحساب |
| `/signup-personal`, `/signup-business` | Personal/business registration / التسجيل الشخصي والتجاري |
| `/forgot-password`, `/reset-password`, `/auth/callback` | Password recovery and auth deep links / استعادة كلمة المرور وروابط المصادقة |
| `/home` | Customer marketplace home / الصفحة الرئيسية للعميل |
| `/explore` | Search, discovery, categories / الاستكشاف والبحث والتصنيفات |
| `/stores` | Featured stores / المتاجر المميزة |
| `/store/[storeId]` | Store profile, offers, reviews / المتجر والعروض والتقييمات |
| `/product/[productId]` | Product details and store offers / تفاصيل المنتج وعروض المتاجر |
| `/cart`, `/checkout` | Cart and order submission / السلة وإرسال الطلب |
| `/orders`, `/orders/[orderId]` | Customer order list and details / قائمة طلبات العميل وتفاصيلها |
| `/addresses`, `/delivery-profile` | Saved addresses and delivery profile / العناوين وبيانات التوصيل |
| `/favorites`, `/my-reviews`, `/notifications` | Favorites, reviews, notifications / المفضلة والتقييمات والإشعارات |
| `/profile`, `/settings` | Profile and preferences / الملف الشخصي والإعدادات |
| `/merchant`, `/merchant/onboarding` | Merchant dashboard and store setup / لوحة التاجر وإعداد المتجر |
| `/merchant/products`, `/merchant/products/new`, `/merchant/products/[offerId]` | Offers and inventory / العروض والمخزون |
| `/merchant/orders`, `/merchant/orders/[orderId]` | Merchant orders and fulfillment / طلبات التاجر ومعالجتها |
| `/merchant/analytics` | Store performance / إحصائيات المتجر |
| `/merchant/settings` | Store settings / إعدادات المتجر |

The root layout in `mobile/app/_layout.tsx` loads fonts, the theme provider, status bar, and shared TanStack Query client. It clears cached query data when Supabase authentication changes between signed-in and signed-out states.

يقوم التخطيط الرئيسي في `mobile/app/_layout.tsx` بتحميل الخطوط ومزوّد السمات وشريط الحالة وعميل TanStack Query المشترك. كما يمسح بيانات الاستعلام المخزنة مؤقتاً عند تغيّر حالة المصادقة في Supabase بين الدخول والخروج.

## 🏗️ System architecture | معمارية النظام

Arownd is a native mobile client backed primarily by Supabase, with shared TypeScript workspace packages and an Express API service foundation.

أراوند تطبيق هاتف أصلي يعتمد في خدماته الحالية بشكل أساسي على Supabase، مع حزم TypeScript مشتركة وخدمة API مبنية باستخدام Express.

```text
┌─────────────────────────────────────────────────────────┐
│                 Arownd Native Mobile App                 │
│                  mobile/ — Expo Router                   │
│                                                         │
│ Customer Marketplace          Merchant Workspace         │
│ Catalog · Cart · Checkout     Store · Offers · Orders    │
│ Profile · Addresses           Analytics · Settings       │
│                                                         │
│ UI Components · Design System · i18n · Query State       │
└───────────────────────────────┬─────────────────────────┘
                                │ Supabase JS Client
                                ▼
┌─────────────────────────────────────────────────────────┐
│                        Supabase                          │
│                                                         │
│ Auth · PostgreSQL · RLS · RPC · Realtime · Storage       │
│                    Edge Functions                       │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────┐  ┌────────────────────────┐
│ Shared workspace packages   │  │ Express API service    │
│ lib/db · lib/api-zod        │  │ artifacts/api-server/  │
│ lib/api-spec                │  │ Health endpoint        │
└─────────────────────────────┘  └────────────────────────┘
```

### Mobile application | تطبيق الهاتف

- `mobile/app/` — route-level screens and layouts. / الشاشات والمسارات والتخطيطات.
- `mobile/components/` — reusable UI and feature components. / المكونات المشتركة.
- `mobile/lib/` — feature services, validation, state helpers, Supabase access, localization, and design-system logic. / خدمات الخصائص والتحقق وإدارة الحالة والاتصال بـSupabase والترجمة ونظام التصميم.
- `mobile/test/` — test setup and adapters. / إعداد الاختبارات والمحولات.
- Expo Router provides file-based navigation and typed route support. / يوفر Expo Router تنقلاً مبنياً على الملفات ومسارات مدعومة بالأنواع.
- TanStack Query manages asynchronous server state, caching, invalidation, and refetching. / يدير TanStack Query حالة البيانات غير المتزامنة والتخزين المؤقت وإعادة الجلب.
- React Hook Form and Zod support validated forms. / يدعم React Hook Form وZod النماذج والتحقق من البيانات.
- AsyncStorage supports persisted native client state and Supabase session storage. / يدعم AsyncStorage حفظ حالة التطبيق وجلسة Supabase محلياً.

### Supabase services | خدمات Supabase

The mobile client uses `@supabase/supabase-js` directly. Current responsibilities include:

يستخدم تطبيق الهاتف مكتبة `@supabase/supabase-js` مباشرة. وتشمل مسؤوليات Supabase الحالية:

- **Auth:** registration, sign-in, persisted sessions, email confirmation, and password recovery. / التسجيل والدخول والجلسات وتأكيد البريد واستعادة كلمة المرور.
- **PostgreSQL:** marketplace catalog, stores, offers, profiles, addresses, orders, reviews, and notifications. / بيانات السوق والمتاجر والعروض والملفات الشخصية والعناوين والطلبات والتقييمات والإشعارات.
- **RPC:** transactional checkout and protected merchant/order operations. / عمليات الطلبات والمعاملات وعمليات التاجر المحمية.
- **RLS:** database-side access boundaries for customer and merchant data. / سياسات التحكم في الوصول إلى بيانات العملاء والتجار.
- **Realtime:** order and notification updates. / تحديثات الطلبات والإشعارات الفورية.
- **Storage:** store/product media and private receipt storage. / صور المتاجر والمنتجات وإيصالات خاصة.
- **Edge Functions:** the repository includes a push-notification sender that uses registered device tokens and Firebase Cloud Messaging credentials. / يحتوي المستودع على دالة لإرسال إشعارات الدفع اعتماداً على رموز الأجهزة وبيانات Firebase Cloud Messaging.

The Supabase client is initialized in `mobile/lib/supabase.ts` with AsyncStorage-backed session persistence, automatic token refresh, and the PKCE auth flow.

يتم تهيئة عميل Supabase في `mobile/lib/supabase.ts` مع حفظ الجلسة عبر AsyncStorage وتجديد الرموز تلقائياً واستخدام تدفق PKCE.

### Express API service | خدمة Express API

**EN:** `artifacts/api-server/` contains an Express 5 service with request logging, CORS/JSON middleware, and an `/api/healthz` endpoint. Current Native feature modules access Supabase directly. This service is an API foundation, not evidence of a complete marketplace REST API.

**AR:** يحتوي `artifacts/api-server/` على خدمة Express 5 تتضمن تسجيل الطلبات ووسائط CORS وJSON ونقطة فحص صحة `/api/healthz`. تتصل وحدات التطبيق الأصلي الحالية بـSupabase مباشرة. لذلك تمثل هذه الخدمة أساساً أولياً لواجهة API، وليست دليلاً على اكتمال REST API خاص بالسوق.

### Shared packages | الحزم المشتركة

| Package / الحزمة | Responsibility / المسؤولية |
|---|---|
| `lib/db/` | Shared database package and Drizzle configuration / حزمة قاعدة البيانات وإعداد Drizzle |
| `lib/api-zod/` | Generated Zod response schemas and types / مخططات وأنواع استجابات Zod المولّدة |
| `lib/api-spec/` | OpenAPI specification and generation configuration / مواصفات OpenAPI وإعدادات التوليد |

These packages provide shared infrastructure; they do not replace Supabase migrations or the mobile app's current direct Supabase access.

توفر هذه الحزم بنية مشتركة، لكنها لا تستبدل ترحيلات Supabase ولا طريقة اتصال تطبيق الهاتف الحالية المباشرة بـSupabase.

## 🧰 Technology stack | التقنيات المستخدمة

| Layer / الطبقة | Technologies / التقنيات |
|---|---|
| Native app / التطبيق | Expo SDK 58, React Native 0.88.1, React 19.3, TypeScript |
| Navigation / التنقل | Expo Router |
| Server state / حالة الخادم | TanStack Query 5 |
| Forms / النماذج | React Hook Form, Zod, `@hookform/resolvers` |
| Backend services / خدمات الخلفية | Supabase Auth, PostgreSQL, RLS, RPC, Realtime, Storage, Edge Functions |
| API foundation / أساس API | Node.js, Express 5 |
| Database tooling / أدوات البيانات | Drizzle ORM and configuration |
| API contracts / عقود API | Zod, OpenAPI |
| UI and icons / الواجهات والأيقونات | Shared React Native UI, Lucide React Native, React Native SVG |
| Fonts / الخطوط | Inter, IBM Plex Sans Arabic |
| Persistence / التخزين المحلي | AsyncStorage |
| Media / الوسائط | Expo Image Picker |
| Quality / الجودة | Vitest, TypeScript, ESLint, Expo Doctor |
| Android / أندرويد | Expo Prebuild, Gradle, EAS build profiles |

## 🗂️ Repository structure | بنية المستودع

```text
.
├── .github/
│   └── workflows/                 # CI, Android builds, secret scanning
├── artifacts/
│   └── api-server/                # Express API service foundation
├── docs/
│   ├── database/                  # Database audits and technical records
│   └── REDESIGN_*.md              # UI/UX redesign documentation
├── lib/
│   ├── api-spec/                  # OpenAPI specification
│   ├── api-zod/                   # Shared generated API schemas
│   └── db/                        # Drizzle database package
├── mobile/
│   ├── app/                       # Expo Router screens
│   ├── assets/                    # App assets
│   ├── components/                # Shared native UI
│   ├── lib/                       # Feature and service modules
│   ├── plugins/                   # Expo config plugins
│   ├── test/                      # Test setup and adapters
│   ├── app.json                   # Expo configuration
│   ├── eas.json                   # EAS build profiles
│   ├── package.json               # Independent mobile scripts/dependencies
│   └── package-lock.json          # Independent npm lockfile
├── supabase/
│   ├── functions/                 # Supabase Edge Functions
│   ├── migrations/                # Versioned SQL migrations
│   └── config.toml                # Supabase CLI configuration
├── package.json                  # Root pnpm workspace scripts/version pin
├── pnpm-workspace.yaml
├── pnpm-lock.yaml                # Backend/shared workspace lockfile
├── tsconfig.base.json
└── README.md
```

**EN:** The active application is in `mobile/`. The repository also contains backend/shared infrastructure and Supabase resources; their presence does not mean every package is part of the mobile runtime.

**AR:** التطبيق النشط موجود داخل `mobile/`. ويحتوي المستودع أيضاً على بنية خدمات خلفية وحزم مشتركة وموارد Supabase، لكن وجودها لا يعني أن كل حزمة منها تعمل ضمن بيئة تشغيل تطبيق الهاتف.

**Package-manager boundary | فصل مديري الحزم:** Root backend/shared packages use the pinned pnpm workspace (`pnpm@10.34.9`). The Expo application in `mobile/` is intentionally independent and uses npm with its own `package-lock.json`; do not install it through the root pnpm workspace.

**فصل مديري الحزم:** تستخدم حزم الخلفية والمكتبات المشتركة في الجذر pnpm بإصدار مثبت `10.34.9`. أما تطبيق Expo داخل `mobile/` فهو مستقل عمداً ويستخدم npm وملف القفل الخاص به `package-lock.json`، ولا يُثبّت ضمن Workspace الجذري.

## 🗄️ Data model and Supabase resources | البيانات وموارد Supabase

The database audit dated **2026-11-08** records the following domains. This is an audited snapshot and must not be treated as a live schema guarantee.

يوثّق تدقيق قاعدة البيانات بتاريخ **2026-11-08** المجالات التالية. هذه لقطة تدقيق بتاريخ محدد وليست ضماناً بأن المخطط نفسه موجود حالياً في البيئة الحية.

| Domain / المجال | Main entities / الكيانات الرئيسية |
|---|---|
| Identity and access / الهوية والصلاحيات | `profiles`, `user_roles`, account types |
| Geography / الجغرافيا | `wilayas`, commune values associated with stores |
| Marketplace / السوق | `stores`, `products`, `categories`, `store_offers`, `product_images` |
| Customer engagement / تفاعل العملاء | `reviews`, `notifications`, `user_activity_archive` |
| Commerce / التجارة | `orders`, `order_items`, `merchant_orders`, `checkout_idempotency` |
| Delivery / التوصيل | `delivery_companies`, `delivery_coverage_areas`, `delivery_services`, `shipments`, tracking/status logs |
| Finance and governance / المالية والحوكمة | `wallet_transactions`, COD collection records, deletion requests, reports, feedback, audit logs |
| Device notifications / إشعارات الأجهزة | `push_device_tokens` |

### Storage buckets | حاويات التخزين

- `store-media` — store logos and cover images. / شعارات المتاجر وصور الغلاف.
- `product-media` — product images. / صور المنتجات.
- `receipts` — private receipt files; access must be restricted to authorized participants. / ملفات إيصالات خاصة يجب تقييد الوصول إليها بالمستخدمين المخولين.

### Database change policy | سياسة تغيير قاعدة البيانات

- **EN:** SQL migrations live in `supabase/migrations/`. Treat historical migrations as immutable. Review migration history, SQL definitions, grants, triggers, and RLS policies before a change. Never assume every repository migration is applied to production. Never replay all migrations blindly against a live database; use an approved, reviewed corrective migration and a verified backup.
- **AR:** توجد ترحيلات SQL داخل `supabase/migrations/`. يجب التعامل مع الترحيلات التاريخية باعتبارها غير قابلة للتعديل. راجع سجل الترحيلات وتعريفات SQL والصلاحيات والمحفزات وسياسات RLS قبل أي تغيير. لا تفترض أن جميع ترحيلات المستودع مطبقة في الإنتاج. لا تعِد تشغيل جميع الترحيلات عشوائياً على قاعدة حية؛ استخدم ترحيلاً تصحيحياً معتمداً ومراجعاً ونسخة احتياطية تم التحقق منها.

## 🚀 Local development | التطوير والتشغيل المحلي

### Requirements | المتطلبات

- Node.js **22.x**
- npm
- Android device/emulator, or an iOS device/simulator on macOS
- A Supabase project with the required application schema and Auth configuration

- Node.js الإصدار **22.x**
- مدير الحزم npm
- جهاز Android أو محاكي، أو جهاز/محاكي iOS على macOS
- مشروع Supabase مجهّز بمخطط البيانات وإعدادات المصادقة المطلوبة

### 1. Configure environment | إعداد البيئة

Create `mobile/.env.local` أنشئ الملف التالي:

```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
```

Use the Supabase **publishable key** in the mobile app. Never put a service-role key, database password, or database connection string in the client.

استخدم **مفتاح Supabase Publishable** في تطبيق الهاتف. يُمنع وضع Service Role Key أو كلمة مرور قاعدة البيانات أو رابط اتصال قاعدة البيانات داخل التطبيق.

### 2. Install dependencies | تثبيت الاعتماديات

**Root workspace (backend/shared packages only) | Workspace الجذر (حزم الخلفية والمكتبات المشتركة فقط):**

Run from the repository root نفّذ من جذر المستودع:

```bash
corepack enable
pnpm install --frozen-lockfile
```

The root workspace covers `artifacts/*` and `lib/*`; it does not install the independent mobile application. Available root scripts include `pnpm run typecheck:libs`, `pnpm run typecheck:api-server`, `pnpm run build:api-server`, and `pnpm run codegen`.

يغطي Workspace الجذري حزم `artifacts/*` و`lib/*`، ولا يثبت تطبيق الهاتف المستقل. تتضمن أوامر الجذر فحص المكتبات وAPI Server وبناءه وتوليد عقود API.

**Expo mobile application | تطبيق Expo للهاتف:**

Run from `mobile/` نفّذ من داخل مجلد الهاتف:

```bash
cd mobile
npm ci --legacy-peer-deps
```

### 3. Start the app | تشغيل التطبيق

```bash
npm start
```

Platform shortcuts اختصارات التشغيل حسب المنصة:

```bash
npm run android
npm run ios
```

**EN:** These commands start the Expo development workflow. They do not create a production APK or AAB.

**AR:** تشغّل هذه الأوامر بيئة تطوير Expo، ولا تنشئ ملف APK أو AAB مخصصاً للإنتاج.

### 4. Available scripts | الأوامر المتاحة

Run from `mobile/` نفّذ من داخل `mobile/`:

| Command / الأمر | Purpose / الوظيفة |
|---|---|
| `npm start` | Start Expo / تشغيل Expo |
| `npm run android` | Start targeting Android / التشغيل على Android |
| `npm run ios` | Start targeting iOS / التشغيل على iOS |
| `npm run typecheck` | TypeScript check / فحص TypeScript |
| `npm run lint` | ESLint / فحص ESLint |
| `npm test` | Vitest suite / تشغيل اختبارات Vitest |
| `npm run doctor` | Expo Doctor / فحص إعدادات Expo |

Additional Expo checks أوامر فحص إضافية:

```bash
npx expo install --check
npx expo config --type public
npx expo-doctor
```

## 🔐 Environment and security | الإعدادات والأمان

### Client configuration | إعدادات التطبيق

The app reads these public variables يقرأ التطبيق المتغيرات العامة التالية:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Any `EXPO_PUBLIC_*` value is embedded in the client bundle and must be considered public. Enforce security through Supabase Auth, RLS, grants, and carefully designed database functions—not by hiding client-side values.

كل متغير يبدأ بـ`EXPO_PUBLIC_*` يُضمّن داخل حزمة التطبيق ويجب اعتباره معلومة عامة. يجب فرض الأمان من خلال Supabase Auth وRLS والصلاحيات ودوال قاعدة البيانات المصممة بعناية، وليس بالاعتماد على إخفاء قيم جهة العميل.

### Authentication deep links | روابط المصادقة

Configured app scheme الإعداد الحالي لمخطط التطبيق:

```text
com.arownd.app
```

Configure matching redirect URLs in Supabase Auth for the environments being tested.

يجب ضبط روابط Redirect المطابقة داخل Supabase Auth لكل بيئة يتم اختبارها، خصوصاً تأكيد البريد واستعادة كلمة المرور.

### Security principles | مبادئ الأمان

- Never commit secrets or production credentials. / لا ترفع الأسرار أو بيانات الإنتاج إلى Git.
- Never ship Supabase service-role credentials in the app. / لا تضع Service Role Key داخل التطبيق.
- Keep receipt storage private and participant-scoped. / حافظ على خصوصية الإيصالات وقيّد الوصول للمصرح لهم.
- Enforce ownership and role checks in database policies and RPC functions. / تحقق من الملكية والأدوار داخل سياسات قاعدة البيانات ودوال RPC.
- Validate at the client boundary, but treat database constraints and server-side validation as authoritative. / تحقّق من المدخلات في التطبيق، مع اعتبار قيود قاعدة البيانات والتحقق الخلفي المرجع النهائي.
- Review RLS, grants, and `SECURITY DEFINER` functions together. / راجع RLS والصلاحيات ودوال `SECURITY DEFINER` معاً.
- Do not change live Supabase data or schema without explicit approval and review. / لا تغيّر مخطط Supabase الحي أو بياناته دون موافقة ومراجعة صريحتين.

## 🧪 Quality and automation | الجودة والأتمتة

GitHub Actions workflows live in `.github/workflows/`. توجد مسارات GitHub Actions داخل `.github/workflows/`.

| Workflow | Purpose / الوظيفة |
|---|---|
| `mobile-quality.yml` | TypeScript, ESLint, Vitest, Expo Doctor / فحوصات جودة تطبيق الهاتف |
| `android-diagnostic-apk.yml` | Android diagnostic APK on native app configuration changes or manual dispatch / بناء تشخيصي عند تغيير إعدادات التطبيق أو يدوياً |
| `android-push-test-apk.yml` | Manual Android debug APK / بناء APK تجريبي يدوياً |
| `android-generate-keystore.yml` | Keystore generation / إنشاء مفتاح توقيع |
| `android-release-aab.yml` | Paused production release workflow / مسار إصدار الإنتاج متوقف حالياً |
| `repository-cleanup.yml` | Root pnpm and mobile npm lockfile maintenance / تحديث ملفات قفل pnpm وnpm |
| `secret-scan.yml` | Full-history secret scanning, including `Arownd-native-v2` / فحص تاريخ المستودع للأسرار بما فيه فرع العمل |

The separate `mobile-android-preview-apk.yml` file is currently present on `Arownd-native-v2` only. Its `workflow_run` trigger requires the workflow file to be present on the repository default branch before GitHub can activate it. It has not been added to `main`.

ملف `mobile-android-preview-apk.yml` موجود حالياً على فرع `Arownd-native-v2` فقط. يتطلب تفعيل مشغّل `workflow_run` وجود الملف في الفرع الافتراضي للمستودع، ولم تتم إضافته إلى `main`.

The active Android diagnostic workflow expects these GitHub Actions secrets ويتطلب مسار البناء التشخيصي أسرار GitHub التالية:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

The preview artifact retention is configured for 14 days. A successful quality workflow alone does not prove that an APK/AAB was built; inspect the relevant Android workflow run and artifact.

مدة الاحتفاظ بملف APK التجريبي مضبوطة على 14 يوماً. نجاح فحوصات الجودة وحده لا يثبت بناء APK أو AAB؛ يجب مراجعة تشغيل مسار Android والملف الناتج.

## 🤖 Android build and distribution | بناء وتوزيع أندرويد

Expo configuration in `mobile/app.json` إعدادات Expo داخل `mobile/app.json`:

| Property / الخاصية | Value / القيمة |
|---|---|
| App name / اسم التطبيق | `Arownd` |
| Expo slug | `arownd-mobile` |
| Android package | `com.arownd.app` |
| iOS bundle identifier | `com.arownd.app` |
| App scheme | `com.arownd.app` |

### Android project boundary | حدود مشروع Android

**EN:** The Expo-generated Android project belongs in `mobile/android/`. It is generated from the Expo configuration by Prebuild.

**AR:** مشروع Android الذي يولّده Expo مكانه `mobile/android/`، ويتم توليده انطلاقاً من إعدادات Expo عبر Prebuild.

The repository-root `android/` directory, if present, belongs to the retired Capacitor application. It is not the Android project for the current Expo app.

مجلد `android/` الموجود في جذر المستودع، إن وُجد، يعود إلى تطبيق Capacitor السابق، وليس مشروع Android الخاص بتطبيق Expo الحالي.

Generate the Expo Android project without reinstalling dependencies ولتوليد مشروع Android دون إعادة تثبيت الاعتماديات:

```bash
cd mobile
npx expo prebuild --platform android --no-install
```

This generates native project files only; it does **not** assemble an APK or AAB.

هذا الأمر يولّد ملفات المشروع الأصلي فقط، ولا ينشئ ملف APK أو AAB.

### EAS build profiles | ملفات بناء EAS

Profiles are defined in `mobile/eas.json`:

- `preview`: internal Android APK distribution. / توزيع APK داخلي للتجربة.
- `production`: Android App Bundle (AAB). / حزمة Android App Bundle للإنتاج.

Before building, link the intended Expo/EAS project and configure signing credentials securely. Verify the artifact and install/test it on target devices before declaring a release ready.

قبل البناء، اربط مشروع Expo/EAS الصحيح واضبط بيانات توقيع Android بطريقة آمنة. تحقّق من الملف الناتج وثبّته واختبره على الأجهزة المستهدفة قبل إعلان جاهزية الإصدار.

## ⚠️ Known integration considerations | ملاحظات التكامل والإصدار

A read-only database audit in `docs/database/AROWND_DATABASE_AUDIT_2026-11-08.md` compared Native code with a live Supabase snapshot on **2026-11-08**. It reported schema drift that affects some Native flows.

قارن تدقيق قراءة فقط موجود في `docs/database/AROWND_DATABASE_AUDIT_2026-11-08.md` بين كود Native ولقطة من Supabase الحية بتاريخ **2026-11-08**. وقد رصد اختلافات في المخطط تؤثر في بعض وظائف التطبيق.

The audit identified Native references to these objects that were absent from the audited live schema:

رصد التدقيق اعتماد كود Native على العناصر التالية التي لم تكن موجودة في مخطط قاعدة البيانات الحية وقت التدقيق:

- `public.user_addresses`
- `public.set_my_default_address(uuid)`
- `public.create_merchant_product_offer(...)`
- `public.update_merchant_product_details(...)`
- `public.get_my_store_analytics(uuid)`

It also reported that the live `create_order_with_delivery` and `submit_review` implementations did not yet match the Native code's intended behavior, alongside migration-history and permission/grant items requiring review.

كما أشار إلى أن تنفيذَي `create_order_with_delivery` و`submit_review` في قاعدة البيانات الحية لم يكونا متوافقين بالكامل مع السلوك الذي يتوقعه كود Native، إضافة إلى نقاط تتعلق بتاريخ الترحيلات والصلاحيات والمنح تحتاج إلى مراجعة.

**Important / مهم:** Migration files in Git do not prove that their changes have been applied to the live database. The audit is a dated snapshot; re-check the target environment before release. Do not fix drift by blindly replaying migrations or editing migration history.

وجود ملفات Migration في Git لا يثبت تطبيق تغييراتها على قاعدة البيانات الحية. التدقيق لقطة بتاريخ محدد؛ أعد فحص البيئة المستهدفة قبل الإصدار. لا تعالج الاختلافات بإعادة تشغيل الترحيلات عشوائياً أو بتعديل تاريخ الترحيلات.

Other verified scope boundaries نقاط أخرى يجب أخذها في الحسبان:

- Native checkout currently uses cash on delivery (`cod`); completed online card/BaridiMob integration is not demonstrated. / يستخدم Checkout حالياً الدفع عند الاستلام (`cod`)؛ ولا يوجد ما يثبت اكتمال الدفع بالبطاقات أو بريدي موب.
- Express currently exposes a health endpoint and middleware, not a complete marketplace API. / توفر خدمة Express حالياً نقطة فحص صحة ووسائط تشغيل، وليست API متكاملة للسوق.
- EAS profiles and workflow definitions describe build paths, not proof of a successful distributable build. / ملفات EAS ومسارات Actions تصف طريقة البناء ولا تثبت نجاح إصدار قابل للتوزيع.
- Live Supabase schema/data and production credentials are outside routine README changes. / مخطط Supabase الحي وبياناته وأسرار الإنتاج ليست ضمن تغييرات README الاعتيادية.

## 🧭 Development conventions | معايير التطوير

- Keep the active native application in `mobile/`. / حافظ على تطبيق الهاتف النشط داخل `mobile/`.
- Keep route screens in `mobile/app/`, reusable UI in `mobile/components/`, and feature/data logic in `mobile/lib/`. / ضع الشاشات في `mobile/app/` والمكونات المشتركة في `mobile/components/` ومنطق الخصائص والبيانات في `mobile/lib/`.
- Keep shared contracts and database tooling in root `lib/` packages. / ضع العقود المشتركة وأدوات قاعدة البيانات في حزم `lib/` الجذرية.
- Keep Supabase configuration, Edge Functions, and migrations in `supabase/`. / احتفظ بإعدادات Supabase ودوال Edge والترحيلات داخل `supabase/`.
- Keep secrets out of source control and public client configuration. / لا تضع الأسرار في Git أو إعدادات العميل العامة.
- Prefer database RPCs for transactional operations and enforce authorization in the database. / فضّل RPC للعمليات المعاملاتية وطبّق الصلاحيات داخل قاعدة البيانات.
- Invalidate/update relevant TanStack Query keys after successful mutations. / حدّث أو ألغِ مفاتيح TanStack Query المناسبة بعد نجاح عمليات التعديل.
- Preserve typed routes, form validation, and test coverage when changing feature logic. / حافظ على المسارات المعرّفة والـValidation وتغطية الاختبارات عند تعديل منطق الخصائص.
- Run focused checks for the affected behavior; use the full quality workflow when appropriate. / نفّذ فحوصات مركزة على الجزء المتأثر، واستخدم مسار الجودة الكامل عندما تستدعي طبيعة التغيير ذلك.

## 📖 Further documentation | وثائق إضافية

- [Native mobile development guide | دليل تطوير تطبيق الهاتف](mobile/README.md)
- [Expo application configuration | إعدادات Expo](mobile/app.json)
- [EAS build profiles | ملفات بناء EAS](mobile/eas.json)
- [Supabase CLI configuration | إعدادات Supabase CLI](supabase/config.toml)
- [Database audit and integration findings | تدقيق قاعدة البيانات وملاحظات التكامل](docs/database/AROWND_DATABASE_AUDIT_2026-11-08.md)
- [Repository redesign audit | تدقيق إعادة تصميم المستودع](docs/REDESIGN_REPOSITORY_AUDIT.md)

---

<p align="center">
  <strong>Arownd — Local Commerce. Connected.</strong><br/>
  <strong>أراوند — التجارة المحلية في مكان واحد.</strong>
</p>
