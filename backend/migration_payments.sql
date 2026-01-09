-- Migration to add PayFast and Scan Credit columns to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS scan_credits int DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS payfast_token text;
