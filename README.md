# Arownd

**Arownd is an Arabic-first, Algeria-focused, multi-store shopping marketplace.** It connects customers with local stores through one native mobile application. Customers can discover stores and products, compare offers from different merchants, place orders, choose home delivery or store pickup, and follow order progress. Merchants can create and manage their storefront, publish product offers, maintain stock and pricing, and process orders.

The active client is a **native Expo + React Native application** in `mobile/`. This repository is maintained as a native-first codebase. The former React web client and its Capacitor wrapper are not part of the active application.

> **Project scope:** This README describes functionality and infrastructure present in the repository. It does not imply that every database migration has been applied to the live Supabase project or that every external operational integration is production-ready. See [Known integration and release considerations](#known-integration-and-release-considerations).

---

## Contents

- [Product overview](#product-overview)
- [User experiences](#user-experiences)
  - [Customer experience](#customer-experience)
  - [Merchant experience](#merchant-experience)
  - [Order, delivery, and payment lifecycle](#order-delivery-and-payment-lifecycle)
- [Application screens and routes](#application-screens-and-routes)
- [System architecture](#system-architecture)
- [Technology stack](#technology-stack)
- [Repository structure](#repository-structure)
- [Data model and Supabase resources](#data-model-and-supabase-resources)
- [Local development](#local-development)
- [Environment and security](#environment-and-security)
- [Quality checks and automated builds](#quality-checks-and-automated-builds)
- [Android build and distribution](#android-build-and-distribution)
- [Known integration and release considerations](#known-integration-and-release-considerations)
- [Development conventions](#development-conventions)

## Product overview

Arownd is designed around a local-commerce marketplace model:

- **One customer app:** browse a shared marketplace of stores and products.
- **Store-specific offers:** a product can be offered by different stores, with each offer carrying its own price, stock, availability, images, and selectable options.
- **Two account journeys:** personal customers and business/merchant accounts.
- **Multi-store order structure:** a customer checkout can be represented by a parent order and merchant-specific suborders, allowing each store to process its own part of the purchase.
- **Algerian delivery context:** checkout uses wilayas and communes, supports home delivery and store pickup, and displays prices in Algerian dinars (DZD).
- **Native mobile foundation:** navigation, authentication callbacks, media selection, persistent client state, and Android/iOS app configuration are implemented with Expo and React Native.

The product has two primary user roles:

| Role | Main purpose | Main workspace |
| --- | --- | --- |
| Customer | Discover products and stores, purchase items, and manage orders | Customer marketplace and account screens |
| Merchant | Operate a store, manage product offers and inventory, and fulfill orders | Merchant dashboard |

## User experiences

### Customer experience

The customer journey is implemented through the following capabilities.

1. **Account access**
   - Create a personal account or sign in with email and password.
   - Confirm an email address through the native deep-link callback.
   - Request a password recovery email and set a replacement password.
   - Maintain a persisted Supabase Auth session on the device.

2. **Marketplace discovery**
   - Browse the home feed, recently added available offers, and featured verified stores.
   - Explore the marketplace by category.
   - Search the catalog by text and category.
   - Open a store profile to review its information and product offers.
   - Open a product page to inspect product details and available store offers.

3. **Product selection**
   - Compare offers for the same product across stores.
   - Review offer price, availability, and stock information.
   - Select supported offer options such as size and color when supplied.
   - Choose a quantity and add the selected store offer to the cart.
   - Save products and stores to favorites.

4. **Cart and checkout**
   - Review cart items grouped by store.
   - Change quantities or remove items.
   - Re-check current offer availability, stock, and price before checkout.
   - Identify blocking cart conditions such as a missing offer, unavailable item, insufficient stock, or changed price.
   - Use a saved address or enter delivery details.
   - Select home delivery or store pickup.
   - Submit the order through the Supabase checkout RPC with a client-persisted idempotency key to reduce accidental duplicate submissions.

5. **Orders and post-purchase**
   - Browse all orders and filter active, delivered, and cancelled orders.
   - Open order details and review order items, store suborders, status, and tracking information.
   - Receive order updates through Supabase Realtime subscriptions and periodic detail refresh.
   - Respond to a merchant shipping quote where the order flow requires customer approval.
   - Cancel an order or eligible merchant suborder when the current order state allows it.

6. **Account and preferences**
   - View profile information and account activity summaries.
   - Maintain delivery/contact details and saved addresses.
   - Review favorites, notifications, and submitted product/store reviews.
   - Mark notifications as read.
   - Change the app appearance between system, light, and dark themes.
   - Update the account password and sign out.

### Merchant experience

A business account can set up and operate a store from the same native application.

1. **Merchant onboarding**
   - Start from a business account and complete the store setup form.
   - Provide store name, contact phone, WhatsApp contact, location, address, business category, and subcategories.
   - Configure opening and closing times.
   - The merchant area checks account/store readiness before allowing access to operational screens.

2. **Storefront management**
   - View the merchant dashboard and store summary.
   - Edit store details and location.
   - Configure opening hours and closed weekdays.
   - Upload or replace the store logo and cover image.
   - Manage the store's public-facing information.

3. **Product and inventory management**
   - Create a product offer with product information, category, brand, description, price, and stock quantity.
   - Add product images from the device photo library.
   - Define supported size and color options.
   - Edit offer price and stock.
   - Search and filter inventory, including low-stock and out-of-stock views.
   - Control offer visibility in the marketplace.

4. **Order processing**
   - View incoming and historical merchant orders.
   - Filter orders by operational status.
   - Open an order to inspect customer, item, delivery, and payment information.
   - Accept or reject eligible orders and handle merchant-managed delivery quotes.
   - Progress fulfillment and tracking states according to the delivery type and order rules.
   - Record eligible cash-on-delivery collection for completed store-pickup orders.

5. **Store performance**
   - Review order counts, delivered orders, active orders, and cancelled orders.
   - View delivered revenue and average delivered order value.
   - Monitor product count, low-stock count, and out-of-stock count.
   - Inspect the delivered-revenue trend for the last seven days.

Merchant routes are guarded by the account's merchant access/readiness state. A signed-in user without a configured merchant store is directed through the onboarding flow rather than being treated as an active merchant.

### Order, delivery, and payment lifecycle

Arownd's current native checkout and merchant screens implement these delivery and payment concepts:

| Area | Implemented behavior |
| --- | --- |
| Home delivery | Customer supplies a wilaya, commune, and street/address details. Merchant-managed delivery can require a shipping quote and customer approval. |
| Store pickup | Customer chooses pickup instead of home delivery. The merchant progresses the pickup/fulfillment state. |
| Payment method | The native checkout currently submits `cod` (cash on delivery). |
| COD collection | The merchant interface exposes a collection action for eligible completed store-pickup orders and records the paid amount/status through the database operation. |
| Order statuses | The customer and merchant interfaces handle states including pending, quoted, confirmed, shipped, delivered, cancelled, and rejected, with delivery-specific tracking states. |
| Multi-store purchases | A parent customer order can contain separate merchant orders, each with its own store, items, status, and shipping fee. |

**Payment scope clarification:** the native checkout code currently sends `_payment_method: "cod"`. This repository does not demonstrate an integrated card processor or a completed online-payment gateway in the native checkout. Do not describe online card payment or BaridiMob payment as available based only on the existence of wallet-related database objects or historical project work.

## Application screens and routes

Expo Router maps files in `mobile/app/` to application routes.

| Route | Purpose |
| --- | --- |
| `/` | Resolve the current session and redirect to the customer home or login |
| `/login`, `/account-type` | Sign in and choose the account journey |
| `/signup-personal`, `/signup-business` | Personal and business registration |
| `/forgot-password`, `/reset-password`, `/auth/callback` | Password recovery and email/deep-link callback |
| `/home` | Customer marketplace home |
| `/explore` | Product discovery, search, and category filtering |
| `/stores` | Featured stores |
| `/store/[storeId]` | Store details, offers, and reviews |
| `/product/[productId]` | Product details, store offers, options, and add-to-cart |
| `/cart`, `/checkout` | Cart review and order submission |
| `/orders`, `/orders/[orderId]` | Customer order list and order details |
| `/addresses`, `/delivery-profile` | Saved addresses and delivery/contact profile |
| `/favorites`, `/my-reviews`, `/notifications` | Customer saved items, reviews, and notifications |
| `/profile`, `/settings` | Account overview and app preferences |
| `/merchant` | Merchant dashboard and access routing |
| `/merchant/onboarding` | Store setup |
| `/merchant/products`, `/merchant/products/new`, `/merchant/products/[offerId]` | Merchant offer and inventory management |
| `/merchant/orders`, `/merchant/orders/[orderId]` | Merchant order queue and fulfillment |
| `/merchant/analytics` | Merchant performance metrics |
| `/merchant/settings` | Store profile and operating settings |

The root layout in `mobile/app/_layout.tsx` loads the font families, theme provider, status bar, and shared TanStack Query client. It also clears cached query data when the Supabase authentication state changes between signed-in and signed-out.

## System architecture

Arownd is organized as a native client with Supabase-backed application services and shared TypeScript packages.

```text
┌──────────────────────────────────────────────────────────┐
│                 Arownd Native Mobile App                 │
│                 mobile/ — Expo Router                    │
│                                                          │
│  Customer marketplace       Merchant workspace           │
│  Catalog / cart / checkout  Store / products / orders     │
│  Profile / addresses       Analytics / settings          │
│                                                          │
│  UI components · Design system · i18n · Query state       │
└──────────────────────────────┬───────────────────────────┘
                               │ Supabase JS client
                               ▼
┌──────────────────────────────────────────────────────────┐
│                       Supabase                            │
│                                                          │
│  Auth · PostgreSQL · RLS · RPC functions · Realtime       │
│  Storage buckets · Edge Functions                        │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────┐
│ Shared workspace packages    │
│ lib/db · lib/api-zod         │
│ lib/api-spec                 │
└──────────────────────────────┘

┌──────────────────────────────┐
│ Express API service          │
│ artifacts/api-server/        │
│ Current health endpoint      │
└──────────────────────────────┘
```

### Mobile application

- `mobile/app/`: route-level screens and layouts.
- `mobile/components/`: reusable customer, authentication, and UI components.
- `mobile/lib/`: feature services, validation, state helpers, Supabase access, localization, and design-system logic.
- `mobile/test/`: test adapters and test setup.
- Expo Router provides file-based navigation and typed route support.
- TanStack Query manages asynchronous server state, caching, invalidation, and refetching.
- React Hook Form and Zod are used for validated form flows.
- AsyncStorage is used for persisted native client state and Supabase session storage.

### Supabase application services

The mobile client currently uses `@supabase/supabase-js` directly. Its application service responsibilities include:

- **Auth:** registration, sign-in, persisted sessions, email confirmation, and password recovery.
- **PostgreSQL:** marketplace catalog, store offers, profiles, addresses, orders, merchant operations, reviews, and notifications.
- **RPC functions:** transactional operations such as checkout, merchant product creation/updates, order transitions, and other protected workflows.
- **Row Level Security (RLS):** database-side access boundaries for user and merchant data.
- **Realtime:** order and notification updates consumed by the mobile application.
- **Storage:** store and product media, plus private receipt storage.
- **Edge Functions:** the repository includes a push-notification sender function that integrates with registered device tokens and Firebase Cloud Messaging credentials.

The app's Supabase client is initialized in `mobile/lib/supabase.ts`. It uses AsyncStorage for persisted authentication, automatic token refresh, and the PKCE auth flow.

### Express API service

`artifacts/api-server/` contains an Express 5 service with request logging, CORS/JSON middleware, and an `/api/healthz` health endpoint. The current Native feature modules access Supabase directly; the Express service should therefore be treated as a small API-service foundation, not as proof that a complete marketplace REST API is implemented.

### Shared packages

| Package | Responsibility |
| --- | --- |
| `lib/db/` | Shared database package and Drizzle configuration |
| `lib/api-zod/` | Generated Zod API response schemas and types |
| `lib/api-spec/` | OpenAPI specification and generation configuration |

These packages provide shared infrastructure. They do not replace the Supabase database migrations or the mobile application's current Supabase data access.

## Technology stack

| Layer | Technologies |
| --- | --- |
| Native application | Expo SDK 58, React Native 0.88.1, React 19.3, TypeScript |
| Navigation | Expo Router |
| Server state | TanStack Query 5 |
| Forms | React Hook Form, Zod, `@hookform/resolvers` |
| Backend services | Supabase Auth, PostgreSQL, RLS, RPC, Realtime, Storage, Edge Functions |
| API service foundation | Node.js, Express 5 |
| Database tooling | Drizzle ORM/configuration |
| API contracts | Zod, OpenAPI |
| UI and icons | Shared React Native UI components, Lucide React Native, React Native SVG |
| Fonts | Inter and IBM Plex Sans Arabic |
| Native persistence | AsyncStorage |
| Media selection | Expo Image Picker |
| Tests and static checks | Vitest, TypeScript, ESLint, Expo Doctor |
| Android packaging | Expo Prebuild, Gradle, EAS build profiles |

## Repository structure

```text
.
├── .github/
│   └── workflows/                 # CI, Android builds, and secret scanning
├── artifacts/
│   └── api-server/                 # Express API service foundation
├── docs/
│   ├── database/                   # Database audits and technical records
│   └── REDESIGN_*.md               # UI/UX redesign documentation
├── lib/
│   ├── api-spec/                   # OpenAPI specification
│   ├── api-zod/                    # Shared generated API schemas
│   └── db/                         # Drizzle database package
├── mobile/
│   ├── app/                        # Expo Router screens
│   ├── assets/                     # App assets
│   ├── components/                 # Shared native UI
│   ├── lib/                        # Feature and service modules
│   ├── plugins/                    # Expo config plugins
│   ├── test/                       # Test setup and adapters
│   ├── app.json                    # Expo application configuration
│   ├── eas.json                    # EAS build profiles
│   └── package.json                # Mobile scripts and dependencies
├── supabase/
│   ├── functions/                  # Supabase Edge Functions
│   ├── migrations/                 # Versioned SQL migrations
│   └── config.toml                 # Supabase CLI configuration
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── README.md
```

## Data model and Supabase resources

The database audit dated **2026-11-08** records the following main data domains. The table list describes the audited Supabase environment and repository dependencies; it is not a substitute for checking the schema of the target environment.

| Domain | Main entities |
| --- | --- |
| Identity and access | `profiles`, `user_roles`, account types |
| Geography | `wilayas`, commune values associated with stores |
| Marketplace | `stores`, `products`, `categories`, `store_offers`, `product_images` |
| Customer engagement | `reviews`, `notifications`, `user_activity_archive` |
| Commerce | `orders`, `order_items`, `merchant_orders`, `checkout_idempotency` |
| Delivery and fulfillment | `delivery_companies`, `delivery_coverage_areas`, `delivery_services`, `shipments`, shipment tracking and status logs |
| Financial and governance | `wallet_transactions`, COD collection records, account deletion requests, content reports, feedback, and admin audit logs |
| Device notifications | `push_device_tokens` |

### Storage buckets

The audit identifies three storage buckets:

- `store-media`: store logos and cover images.
- `product-media`: product images.
- `receipts`: private receipt files; access must remain scoped to the relevant participants.

### Database change policy

- SQL migrations are maintained in `supabase/migrations/`.
- Treat historical migrations as immutable.
- Review the target project's migration history, SQL definitions, grants, triggers, and RLS policies before applying changes.
- Do not assume that every repository migration has already been applied to the live project.
- Never replay all migrations blindly against a live database. Use a reviewed reconciliation/corrective migration and a verified backup when a live schema change is approved.

## Local development

### Requirements

- Node.js **22.x**
- npm
- Android device/emulator for Android development, or an iOS device/simulator on macOS
- A Supabase project with the required application schema and Auth configuration

### 1. Configure the mobile environment

Create `mobile/.env.local`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
```

Use the Supabase **publishable key** in the mobile app. The mobile client must never contain a service-role key, database password, or database connection string.

### 2. Install mobile dependencies

Run commands from the mobile project directory:

```bash
cd mobile
npm install --legacy-peer-deps
```

### 3. Start the application

```bash
npm start
```

To open the app directly on a connected platform:

```bash
npm run android
npm run ios
```

These commands start the Expo development workflow. They are not production APK/AAB build commands.

### 4. Available mobile scripts

Run from `mobile/`:

| Command | Purpose |
| --- | --- |
| `npm start` | Start the Expo development server |
| `npm run android` | Start Expo targeting Android |
| `npm run ios` | Start Expo targeting iOS |
| `npm run typecheck` | Run TypeScript without emitting files |
| `npm run lint` | Run ESLint |
| `npm test` | Run the Vitest suite |
| `npm run doctor` | Run Expo Doctor |

Additional useful Expo checks:

```bash
npx expo install --check
npx expo config --type public
npx expo-doctor
```

## Environment and security

### Client configuration

The app reads only these public client variables:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Values prefixed with `EXPO_PUBLIC_` are embedded in the client bundle and must be considered public. Security must be enforced by Supabase Auth, RLS, grants, and carefully designed database functions—not by hiding client-side values.

### Authentication deep links

The configured application scheme is:

```text
com.arownd.app
```

The same scheme is used for email confirmation and password recovery redirects. Configure matching redirect URLs in Supabase Auth for the app environments being tested.

### Security principles

- Never commit secrets or production credentials.
- Never ship Supabase service-role credentials in the app.
- Keep private receipt storage private and participant-scoped.
- Enforce ownership and role checks inside database policies and RPC functions.
- Validate user input at the client boundary, while treating database constraints and server-side validation as authoritative.
- Review RLS policies, table/column grants, and `SECURITY DEFINER` functions together.
- Do not modify a live Supabase project or its data without an explicitly approved, reviewed change.

## Quality checks and automated builds

GitHub Actions workflows are maintained in `.github/workflows/`.

| Workflow | Purpose |
| --- | --- |
| `mobile-quality.yml` | Install mobile dependencies and run TypeScript, ESLint, Vitest, and Expo Doctor |
| `mobile-android-preview-apk.yml` | Build an Android preview APK after the required quality workflow succeeds and upload the artifact |
| `android-diagnostic-apk.yml` | Android diagnostic build workflow |
| `android-generate-keystore.yml` | Keystore-generation workflow |
| `android-push-test-apk.yml` | Android test APK workflow |
| `android-release-aab.yml` | Android release AAB workflow |
| `secret-scan.yml` | Repository secret scanning |

The preview APK workflow uses the Supabase public client configuration as GitHub Actions secrets:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

The preview artifact is configured for a 14-day retention period. A successful quality workflow is not, by itself, evidence that an APK or AAB was built; check the corresponding Android workflow run and artifact.

## Android build and distribution

The Expo app configuration is in `mobile/app.json`:

- App name: `Arownd`
- Expo slug: `arownd-mobile`
- Android package: `com.arownd.app`
- iOS bundle identifier: `com.arownd.app`
- App scheme: `com.arownd.app`

### Android project boundary

The Expo-generated Android project belongs at `mobile/android/`. It is generated from the Expo configuration when prebuild is run.

The repository-root `android/` directory, if present in a checkout, belongs to the retired Capacitor application and is **not** the Android native project for the current Expo app. Do not copy or reuse it.

Generate the Expo Android project without reinstalling dependencies:

```bash
cd mobile
npx expo prebuild --platform android --no-install
```

This command generates native project files only. It does **not** assemble an APK or AAB.

### EAS profiles

The build profiles are defined in `mobile/eas.json`:

- `preview`: internal Android APK distribution.
- `production`: Android App Bundle (AAB) for production distribution.

Before an EAS build, link the Expo app to the intended EAS project and configure Android signing credentials securely. Confirm the generated artifact and install/test it on the target devices before treating a release as verified.

## Known integration and release considerations

A read-only database audit recorded in `docs/database/AROWND_DATABASE_AUDIT_2026-11-08.md` compared the Native code with a live Supabase snapshot on that date. It reported schema drift that must be resolved before relying on the affected flows in that live environment.

The audit specifically identified Native code references to these objects that were absent from the audited live schema:

- `public.user_addresses`
- `public.set_my_default_address(uuid)`
- `public.create_merchant_product_offer(...)`
- `public.update_merchant_product_details(...)`
- `public.get_my_store_analytics(uuid)`

It also reported that the live `create_order_with_delivery` and `submit_review` implementations did not yet match the current repository's intended Native behavior, plus migration-history differences and permission/grant items requiring review.

**Important:** repository migration files for these capabilities do exist, but their presence in Git does not prove that their effects are present in the live database. The audit is a dated snapshot; re-check the current target environment before making release decisions. Do not resolve these findings by blindly applying every SQL file or editing migration history.

Other scope boundaries visible in the current code:

- Native checkout currently submits cash-on-delivery (`cod`); no completed online card/BaridiMob payment integration is demonstrated by the checkout implementation.
- The Express API service currently exposes a health endpoint and shared middleware, not a complete marketplace API.
- EAS build profiles and GitHub workflows describe build paths; verify actual workflow runs and artifacts before claiming a distributable build exists.
- Supabase live schema changes, production credentials, and customer data are outside the scope of ordinary mobile README or UI changes.

## Development conventions

- Keep the active native application in `mobile/`.
- Keep route screens in `mobile/app/`, reusable UI in `mobile/components/`, and feature/data logic in `mobile/lib/`.
- Keep shared contracts and database tooling in the root `lib/` packages.
- Keep Supabase configuration, Edge Functions, and versioned migrations in `supabase/`.
- Keep secrets out of source control and out of public client configuration.
- Prefer database RPCs for multi-step transactional operations and enforce authorization in the database.
- Invalidate or update relevant TanStack Query keys after successful mutations.
- Preserve typed routes, form validation, and the existing test coverage when changing feature logic.
- Run focused checks for the files and behavior affected by a change; use the full quality workflow when the change warrants it.

## Further documentation

- [Native mobile development guide](mobile/README.md)
- [Expo application configuration](mobile/app.json)
- [EAS build profiles](mobile/eas.json)
- [Supabase CLI configuration](supabase/config.toml)
- [Database audit and integration findings](docs/database/AROWND_DATABASE_AUDIT_2026-11-08.md)
- [Repository redesign audit](docs/REDESIGN_REPOSITORY_AUDIT.md)
