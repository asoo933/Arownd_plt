# Arownd Database Audit — 2026-11-08

> Status: read-only inventory / draft. This document records the live Supabase snapshot and the current `Arownd-native-v2` code references. It is not an approved deletion or migration plan. No database writes or deletions were performed for this audit.

## 1. Environment

- Supabase project: `Arownd` (`nagzoafkitfsqlcwsdau`), region `eu-west-1`, PostgreSQL 17.
- Application branch reviewed: `Arownd-native-v2`.
- Live migration history: 78 entries in `supabase_migrations.schema_migrations`.
- Repository migration files: 83.
- Public tables: 31; private tables: 3.
- Public views: `approved_delivery_companies`, `public_personal_profiles`.
- Storage buckets: `store-media`, `product-media`, `receipts`.
- Public enums: `app_role`, `review_target_type`, `review_status`, `account_type`.

## 2. Table inventory and preliminary disposition

Disposition is provisional. A zero row count does not mean a table is unused: several tables are needed for future transactions, RPCs, triggers, audit, or delivery workflows.

### Core marketplace and identity — KEEP

| Table | Live rows | Reason |
|---|---:|---|
| `user_roles` | 14 | Server-side role and authorization checks |
| `profiles` | 11 | Personal/business account profile |
| `wilayas` | 58 | Location and delivery pricing reference data |
| `stores` | 3 | Merchant storefront and ownership |
| `products` | 18 | Product catalog |
| `store_offers` | 4 | Store-specific price, stock, availability and options |
| `product_images` | 8 | Offer image records |
| `categories` | 49 | Marketplace taxonomy |
| `reviews` | 2 | Product/store reviews |
| `reservations` | 3 | Reservation lifecycle and merchant collection |
| `orders` | 14 | Parent customer orders |
| `order_items` | 14 | Purchased line items and snapshots |
| `merchant_orders` | 14 | Per-store suborders and merchant fulfillment |
| `notifications` | 99 | In-app notifications |
| `checkout_idempotency` | 3 | Server-side duplicate checkout protection |
| `user_activity_archive` | 11 | Customer activity hiding/archive |
| `push_device_tokens` | 1 | Push notification device registration |

### Delivery and fulfillment — KEEP while delivery workflows remain enabled

| Table | Live rows | Reason |
|---|---:|---|
| `delivery_companies` | 0 | Delivery-company identity and approval |
| `delivery_coverage_areas` | 0 | Company service-area configuration |
| `delivery_services` | 0 | Delivery service/price configuration |
| `shipments` | 1 | Shipment state and assignment |
| `shipment_status_logs` | 0 | Shipment audit trail |
| `shipment_tracking` | 0 | Shipment location history |
| `merchant_order_cod_collections` | 0 | COD collection reconciliation |
| `merchant_order_tracking_events` | 0 | Merchant suborder tracking timeline |

These are not deletion candidates solely because they currently have no rows. The web delivery module and database RPCs still reference delivery entities.

### Financial, support and governance — KEEP pending product-scope decision

| Table | Live rows | Reason |
|---|---:|---|
| `wallet_transactions` | 0 | Wallet/payment transaction requests and review |
| `account_deletion_requests` | 0 | Account deletion workflow and retention record |
| `content_reports` | 0 | Moderation/reporting workflow |
| `feedback` | 1 | User feedback |
| `platform_admin_audit_logs` | 0 | Administrative audit trail |

### Preliminary cleanup candidate — REVIEW, do not drop yet

| Table | Live rows | Finding |
|---|---:|---|
| `public.schema_migrations` | 18 | Legacy custom migration ledger. Supabase's canonical ledger is `supabase_migrations.schema_migrations` (78 rows). No current Native client reference was found in the inspected modules. Verify repository scripts, functions, triggers and operational tooling before archiving/removing it. |

### Private schema — KEEP

| Table | Live rows | Reason |
|---|---:|---|
| `private.approved_delivery_companies_public` | 0 | Backing data for public approved-company directory view |
| `private.public_personal_profiles` | 2 | Backing data for opt-in public profile view |
| `private.wallet_transaction_decisions` | 0 | Private wallet review decisions and idempotency |

The two private directory/profile tables are referenced by public views. The wallet decision table is linked to `wallet_transactions`.

## 3. Storage

- `store-media`: public store logo/cover media. KEEP.
- `product-media`: public product media. KEEP.
- `receipts`: private payment receipts. KEEP private; access must remain participant-scoped.

Storage currently has owner upload/update/delete policies, public media read, and a separate receipt participant-read policy. Bucket removal is not proposed.

## 4. Code-to-database references verified

Inspected Native modules include checkout, merchant products, merchant operations, orders, reviews, addresses, notifications, catalog, store settings and analytics. The web code paths inspected include the shared `src/lib/sooqy.ts` data layer and `src/lib/delivery.ts`.

Confirmed references include:
- Native checkout: `wilayas`, `stores`, `profiles`, `create_order_with_delivery`.
- Native merchant products: `stores`, `store_offers`, `product_images`, `product-media`, `create_merchant_product_offer`, `update_merchant_product_details`.
- Native merchant operations: `user_roles`, `stores`, `categories`, `store_offers`, `order_items`, `merchant_orders`, `shipments`, and merchant fulfillment RPCs.
- Native reviews: `reviews`, `submit_review`.
- Native addresses: `user_addresses`, `set_my_default_address`.
- Native notifications: `notifications`.
- Native analytics: `get_my_store_analytics`.
- Web shared data layer: catalog, stores, offers, reviews, activity archive, reservations, orders, notifications, receipts, profiles, roles, images, order items, merchant orders, public profile view and wallet transactions.
- Web delivery module: approved delivery companies, delivery companies, coverage areas, services, shipments, COD collections, tracking and orders.

## 5. Confirmed live gaps / release blockers

The following objects are referenced by the current Native code but are absent from the live schema:
- `public.user_addresses`.
- `public.set_my_default_address(uuid)`.
- `public.create_merchant_product_offer(...)`.
- `public.update_merchant_product_details(...)`.
- `public.get_my_store_analytics(uuid)`.

Additional live behavior requiring correction/reconciliation:
- `public.submit_review(...)` exists, but the live implementation is older than the repository's verified-purchase submission migration.
- `public.create_order_with_delivery(...)` requires an idempotency key but currently delegates to the older `create_order_with_delivery_unkeyed` implementation. The live implementation must be reconciled with the repository's merchant-managed delivery and BaridiMob requirements.
- Profile, store, notification and offer column grants show partial/manual schema drift relative to repository migrations. Do not replay those migrations blindly.

## 6. Migration history reconciliation

The repository contains 83 SQL migration files; the live Supabase ledger contains 78 entries. Comparing migration names gives:
- 15 repository migration names not present in the live ledger.
- 10 live ledger names not present as current repository filenames.

This is a reconciliation task, not a list of migrations to apply. Some files may have been renamed, superseded, or applied manually. Compare SQL effects, function definitions, grants, triggers and policies before creating any corrective migration or changing history.

## 7. Security observations

- RLS is enabled on all 31 inspected public tables and all 3 inspected private tables.
- The Security Advisor reports 33 authenticated-callable `SECURITY DEFINER` functions. This is a review queue, not proof that all 33 are vulnerable; inspect each function's identity checks, ownership checks, grants and search_path.
- RLS-enabled tables without policies include `public.schema_migrations`, `public.checkout_idempotency`, and `private.wallet_transaction_decisions`. The latter two appear intentionally inaccessible directly to clients and should remain deny-by-default. The legacy migration ledger needs separate review.
- The Security Advisor also reports `pg_net` installed in `public`; review extension placement before production.
- Do not remove indexes based only on an unused-index advisor result; first inspect query workload and foreign-key coverage.

## 8. Next steps (still read-only until separately approved)

1. Complete a full web + Native source-reference scan, including scripts, edge functions and database function bodies.
2. Map each of the 15 repository-only and 10 database-only migration names to its SQL effect.
3. Verify all foreign keys, triggers, function dependencies, grants, RLS policies and Storage policies by role.
4. Confirm product scope for delivery-company workflows and wallet before considering any deprecation.
5. Produce a final KEEP / MERGE / ARCHIVE / DROP matrix with data migration and rollback plan.
6. Take and verify a restorable backup before any production DDL or data cleanup.
7. Implement approved changes only as new migrations; never edit historical migrations.

## 9. Safety record

- Database reads only.
- No table, column, row, function, policy, bucket or migration history was changed.
- No migrations were applied.
- No tests were run.
