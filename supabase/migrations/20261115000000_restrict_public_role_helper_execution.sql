REVOKE ALL ON FUNCTION public.current_app_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_app_role() FROM anon;
GRANT EXECUTE ON FUNCTION public.current_app_role() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_active_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_active_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_active_admin() TO authenticated, service_role;
