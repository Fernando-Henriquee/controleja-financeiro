REVOKE EXECUTE ON FUNCTION public.is_profile_owner(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_profile_owner(uuid) TO authenticated;