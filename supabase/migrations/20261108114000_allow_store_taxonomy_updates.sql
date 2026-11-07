-- Preserve the existing Web merchant editor's store taxonomy fields while
-- keeping owner, slug, verification and rating server-managed.
grant update (category, subcategories)
on table public.stores to authenticated;
