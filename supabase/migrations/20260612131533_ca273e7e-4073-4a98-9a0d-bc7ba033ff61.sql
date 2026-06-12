-- Internal trigger-only functions: never meant to be called via API
REVOKE EXECUTE ON FUNCTION public.update_campaign_amount() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.link_donation_to_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_support_thread() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prune_account_backups() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.next_cerfa_number(uuid, integer) FROM PUBLIC, anon, authenticated;
