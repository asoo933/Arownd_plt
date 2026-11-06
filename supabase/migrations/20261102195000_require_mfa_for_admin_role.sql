-- Require a verified second authentication factor for every platform-admin
-- authorization decision. Users can still read their own role row at AAL1 so
-- they can enroll MFA; admin privileges themselves require AAL2.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN false
    WHEN _role = 'admin'::public.app_role
      AND coalesce(auth.jwt() ->> 'aal', 'aal1') <> 'aal2'
      THEN false
    WHEN _user_id = auth.uid()
      OR (
        coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
        AND EXISTS (
          SELECT 1
          FROM public.user_roles admin_role
          WHERE admin_role.user_id = auth.uid()
            AND admin_role.role = 'admin'::public.app_role
        )
      )
      THEN EXISTS (
        SELECT 1
        FROM public.user_roles target_role
        WHERE target_role.user_id = _user_id
          AND target_role.role = _role
      )
    ELSE false
  END;
$function$;

-- Keep this helper callable only by signed-in app sessions and trusted backend
-- sessions. It must never be an anonymous SECURITY DEFINER entry point.
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- Remove legacy permissive policies that checked the admin role directly and
-- therefore bypassed the AAL2 requirement enforced by has_role().
DROP POLICY IF EXISTS admin_read_profiles ON public.profiles;
DROP POLICY IF EXISTS admin_read_orders ON public.orders;
