-- Phone-based login lookup is callable only by the server-side service role.
CREATE OR REPLACE FUNCTION public.resolve_student_login_email(p_phone text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $function$
  SELECT p.email
  FROM public.profiles AS p
  WHERE p.phone = p_phone
    AND p.email IS NOT NULL
  ORDER BY p.created_at DESC
  LIMIT 1
$function$;

REVOKE ALL ON FUNCTION public.resolve_student_login_email(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.resolve_student_login_email(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_student_login_email(text) TO service_role;

ALTER FUNCTION public.set_updated_at() SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.handle_new_auth_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_auth_user() FROM anon, authenticated;
