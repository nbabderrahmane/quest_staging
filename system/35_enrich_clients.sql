/*
* Migration: Enrich Clients Table
* Description: Adds profile fields to the clients table to support CRM features.
*/

-- Add new columns with safe defaults
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS last_name text,
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS company_name text;

-- Data Migration: Copy existing 'name' to 'company_name' for backward compatibility
UPDATE public.clients
SET company_name = name
WHERE company_name IS NULL;

-- Create an index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_clients_email ON public.clients(email);
