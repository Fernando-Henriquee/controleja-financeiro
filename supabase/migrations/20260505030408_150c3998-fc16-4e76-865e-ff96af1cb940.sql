REVOKE EXECUTE ON FUNCTION public.is_profile_owner(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_profile_owner(uuid) TO postgres, service_role;

REVOKE EXECUTE ON FUNCTION public.seed_profile_defaults() FROM PUBLIC, anon, authenticated;