-- Step 1: Add 'admin' to the app_role enum only
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin';