-- Ensure policies using helper function can execute for authenticated users
grant execute on function public.is_profile_owner(uuid) to authenticated;

-- Keep trigger function protected from direct API calls
revoke execute on function public.seed_profile_defaults() from authenticated;
