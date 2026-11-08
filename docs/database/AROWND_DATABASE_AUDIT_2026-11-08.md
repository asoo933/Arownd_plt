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


---

## 10. Second verification pass — 2026-11-08

A second read-only pass re-queried the live project and the same branch. The counts and key missing objects below were reconfirmed.

### Confirmed inventory

- Exactly 31 tables in `public` and 3 in `private`.
- All 34 inspected tables have RLS enabled.
- Two public views exist: `approved_delivery_companies` and `public_personal_profiles`; both read from private backing tables.
- Public table policies exist on 31 of 34 tables. The three zero-policy tables are:
  - `public.checkout_idempotency`
  - `public.schema_migrations`
  - `private.wallet_transaction_decisions`
- The first and third should remain deny-by-default for direct client access. The legacy public migration ledger needs ownership and operational-script review.
- Three Storage buckets were reconfirmed: `store-media`, `product-media`, `receipts`.

### Corrections and stronger findings

1. The earlier row counts are inventory snapshots, not proof that a table is unused. In particular, all zero-row delivery, audit, wallet and governance tables remain KEEP/REVIEW until feature scope and dependencies are confirmed.
2. The live privilege audit reconfirmed broad table-level privileges for `authenticated`:
   - `store_offers`: INSERT and UPDATE are granted at table level.
   - `notifications`: INSERT, UPDATE and DELETE are granted at table level.
   RLS policies may constrain row access, but these grants still violate the intended column-level allowlist. This is a security blocker, not a cleanup/deletion candidate.
3. `profiles` has table-level DELETE grant for `authenticated`. Review whether deletion should be exclusively through the account-deletion RPC and remove direct DELETE if not required. Do not infer safety from RLS alone.
4. Many SECURITY DEFINER functions still use `search_path=public` or `public, storage` rather than an empty/strict path. This includes legacy archive, order cancellation, reservation, merchant fulfillment, shipment, and notification functions. Review each function's qualified object references, identity checks, EXECUTE grants and trigger-vs-RPC use before changing it.
5. The Advisor's 33 SECURITY DEFINER findings are warnings about callable functions, not 33 confirmed exploitable vulnerabilities. A function-by-function security review remains outstanding.
6. Several trigger entries appear more than once in the information_schema trigger listing because trigger metadata is emitted per triggering event. This output alone does not prove duplicate trigger objects. Verify from `pg_trigger` before attempting deduplication.

### Second-pass object checks

| Object | Live state | Decision |
|---|---|---|
| `user_addresses` | Missing | Required by current Native address screens; create only after backup and migration reconciliation |
| `set_my_default_address(uuid)` | Missing | Required by Native address flow |
| `create_merchant_product_offer` | Missing | Required by Native merchant product flow |
| `update_merchant_product_details` | Missing | Required by Native merchant product flow |
| `get_my_store_analytics` | Missing | Required by Native merchant analytics screen |
| `submit_review` | Exists, old definition | Replace/reconcile; do not create duplicate function |
| `create_order_with_delivery` | Exists, old wrapper delegates to legacy unkeyed implementation | Reconcile with current checkout contract; do not replace blindly |

### Migration comparison — confirmed by exact migration names

- Repository: 83 migration files.
- Live Supabase ledger: 78 entries.
- Repository-only names (15): `require_mfa_for_admin_role`, `direct_merchant_fulfillment`, `checkout_support_merchant_managed_delivery`, `atomic_merchant_product_creation`, `update_merchant_product_details`, `personal_user_addresses`, `verified_review_submission`, `secure_personal_profile_updates`, `profile_column_write_allowlist`, `serialize_default_address_updates`, `restrict_notification_updates`, `restrict_store_owner_update_columns`, `merchant_store_analytics`, `restrict_merchant_offer_updates`, `allow_store_taxonomy_updates`.
- Ledger-only names (10): `optimize_rls_and_index_cleanup`, `remove_redundant_public_read_policies`, `optimize_merchant_tracking_rls_auth_lookup`, `restrict_product_view_counter_rpc`, `delivery_company_assignment_security`, `platform_admin_app_metadata_mfa`, `admin_delivery_company_approval`, `secure_wallet_transaction_permissions`, `admin_wallet_transaction_review`, `move_wallet_review_to_private_schema`.

Name mismatch is not proof of unapplied SQL. A migration may have been renamed or manually applied. The next step is SQL-effect reconciliation, not replaying all 15 files.

### Updated priority order

1. **P0 — Security:** tighten authenticated table/column grants for `store_offers` and `notifications`; review direct `profiles` DELETE; audit callable SECURITY DEFINER functions and search_path.
2. **P0 — Checkout correctness:** reconcile live order wrapper with payment/delivery/idempotency contract.
3. **P1 — Native feature availability:** reconcile the five missing address, merchant-product and analytics objects.
4. **P1 — Review integrity:** replace old `submit_review` with verified-activity eligibility logic.
5. **P2 — Data minimization:** review `public.schema_migrations`, legacy duplicate views/functions, unused indexes and obsolete columns only after dependency scans.
6. **P3 — Performance:** assess unused indexes and foreign-key indexes with real query workload; do not bulk-drop.

### Verification limits

- Read-only metadata, catalog and source-file inspection only.
- No database writes, DDL, grants, policy changes, migration applications or row deletions.
- No runtime integration tests or restore drill were performed.
- Full web/mobile reference scan and per-function SECURITY DEFINER code review are not yet complete.


---

## 11. SECURITY DEFINER review — second workstream (2026-11-08)

This pass queried all live `SECURITY DEFINER` routines in `public` and `private`, their ACLs, effective execute privileges, function configuration and trigger bindings.

### Inventory counts

- 58 SECURITY DEFINER functions total across `public` and `private`.
- 43 do not explicitly set an empty `search_path` (this includes functions with an explicit `public` path and a few trigger-only routines with a controlled schema path).
- 35 non-trigger functions are executable by `authenticated`.
- 24 authenticated-callable functions have a non-empty or default search_path.
- No non-trigger SECURITY DEFINER function in these schemas is executable by `anon`.
- 17 SECURITY DEFINER trigger functions are attached to enabled triggers. Trigger functions are not RPC entry points; evaluate their trigger bindings and ACLs separately.

These counts are a hardening queue, not a claim that all listed functions are exploitable. Explicitly schema-qualified SQL plus a locked-down search path is the desired pattern. Trigger-only routines can reasonably use a narrow trusted path when fully qualified references are not used, but should not expose unnecessary EXECUTE grants.

### Confirmed high-priority behavior defects

#### P0 — Checkout wrapper is stale

Live `public.create_order_with_delivery`:
- correctly requires an idempotency key and locks by user/key;
- stores a request hash and returns the prior order for a matching retry;
- delegates to `public.create_order_with_delivery_unkeyed`.

The unkeyed implementation currently rejects every payment method except `cod` and rejects both a receipt URL and a delivery-company ID. Therefore BaridiMob receipt checkout and carrier-assigned checkout cannot pass through this live wrapper. This is a confirmed live contract mismatch, not merely a search_path warning.

#### P0 — Review RPC approves submissions directly

Live `public.submit_review`:
- checks legacy `orders` + `order_items` for delivered product/store purchases;
- checks collected reservations for store reviews;
- writes `status='approved'` immediately;
- does not check `merchant_orders` delivery state and does not implement the repository's pending moderation contract.

This creates a mismatch with the Native UI/repository migration and can auto-publish reviews. Replace/reconcile only after validating legacy review compatibility and existing rows.

#### P1 — Shipment state transitions need a formal state machine

Live `public.update_shipment_status` checks authentication, approved-company ownership (or admin role), locks parent order and shipment, and updates aggregates when delivered. However, it accepts any value from the allowed status list without validating the transition from the current status. For example, the code does not itself prevent moving from a terminal state to another allowed state. Add explicit transition rules and actor-specific permissions in a new migration after mapping actual workflow transitions.

#### P1 — Helper RPC exposure/search_path

The owner/relationship helpers `is_store_owner`, `is_offer_owner`, `is_order_owner`, and `is_order_merchant` are executable by authenticated and use `search_path=public`. Their identity checks must remain correct, but they should be hardened with `SET search_path TO ''` and fully qualified references. Verify every RLS policy and function dependency before changing signatures or grants.

#### P1 — Legacy order/reservation functions

`cancel_my_order`, `cancel_reservation`, and `archive_my_activity` are authenticated-callable SECURITY DEFINER functions using `search_path=public`. Their definitions use owner predicates and status guards, but should be hardened to empty search_path and reviewed against the newer merchant-suborder lifecycle so legacy order cancellation cannot bypass the newer rules.

#### P1 — Merchant and delivery mutation RPCs

Reviewed examples:
- `merchant_submit_order_quote`: checks store ownership/admin, order status and delivery type; updates quote and parent totals.
- `merchant_assign_delivery_company`: checks store ownership/admin, confirmed state, company approval and coverage area; creates/assigns shipment.
- `merchant_update_merchant_order_status`: checks store ownership/admin and confirmed status before marking delivered.
- `collect_merchant_order_cod`: checks delivery completion and carrier/company or store ownership before recording COD.
- `link_order_shipment`: allows order owner or merchant relationship and verifies shipment belongs to the parent order; it should be reviewed for legacy multi-merchant compatibility and whether direct RPC use is still required.

These functions have substantive authorization checks in the inspected definitions, but their `search_path=public` should be hardened. This is not a recommendation to delete them.

### Trigger functions and grants

- 17 trigger functions are bound to enabled triggers. They include profile synchronization, approved delivery directory synchronization, merchant-order synchronization, order/shipment status guards, rating aggregates, notification creation and push dispatch.
- `private.dispatch_notification_push()` is bound only to `notifications_send_push` on `public.notifications`. Its catalog privileges resolve as executable by anon/authenticated through default PUBLIC execute. Because it is a trigger function, it is not callable as an ordinary RPC, but its EXECUTE ACL should still be explicitly revoked from PUBLIC/anon/authenticated and granted only as required for trigger operation.
- Other trigger functions mostly have ACLs limited to postgres/service_role or postgres. Do not remove or duplicate triggers based on event-level metadata; verify the single trigger binding first.

### Functions to retain

Do not delete SECURITY DEFINER routines simply because they appear in the advisor. The inspected functions support essential capabilities: checkout, stock and reservations, merchant order fulfillment, delivery, COD, account lifecycle, profile visibility, reviews, notifications, wallet review, audit logging, and RLS ownership checks.

### Remediation order

1. Fix checkout contract and review moderation behavior in new migrations, preserving idempotency and legacy compatibility.
2. Define and enforce shipment transition matrix, including admin/carrier/merchant actors.
3. Harden authenticated-callable functions to empty search_path using fully qualified objects.
4. Explicitly tighten trigger function ACLs where safe; preserve trigger execution.
5. Re-audit RLS policies and function grants after changes.
6. Only after feature and dependency verification, identify truly obsolete RPCs for archival/removal.

### Scope and limitations

- This is a catalog and function-definition review, not a penetration test.
- The 58 routines were inventoried. Definitions were inspected in detail for checkout, reviews, shipment status, reservation cancellation, COD collection, delivery-company assignment, merchant quote/status updates and shipment linking. Other definitions still need individual code-level review.
- No SQL writes, function changes, grants, trigger changes, migrations, or row updates were performed.
- No runtime integration tests or test-user role simulations were run.
