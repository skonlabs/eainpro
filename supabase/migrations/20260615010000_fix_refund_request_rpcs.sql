-- The approve/reject RPCs in 20260615000000 referenced columns that don't
-- exist in this project's schema (credits_spent, wallet_transactions).
-- Drop them — the UI calls the existing public.refund_unlock instead and
-- only flips the request row's status directly via RLS.
drop function if exists public.approve_refund_request(uuid, text);
drop function if exists public.reject_refund_request(uuid, text);
