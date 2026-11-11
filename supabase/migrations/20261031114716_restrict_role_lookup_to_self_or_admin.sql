CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT
    (
      _user_id = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM public.user_roles admin_role
        WHERE admin_role.user_id = auth.uid()
          AND admin_role.role = 'admin'::public.app_role
      )
    )
    AND EXISTS (
      SELECT 1
      FROM public.user_roles target_role
      WHERE target_role.user_id = _user_id
        AND target_role.role = _role
    );
$function$;
