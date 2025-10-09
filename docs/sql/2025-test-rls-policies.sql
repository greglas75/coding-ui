-- 🧪 Test RLS policies for categories table
-- Run this in Supabase SQL Editor to test permissions

-- 1. Test basic access to categories table
SELECT id, name FROM public.categories LIMIT 5;

-- 2. Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'categories';

-- 3. If RLS is enabled, create policy for authenticated users
-- (Only run if RLS is enabled and you get permission errors)

-- Enable RLS if not already enabled
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Create policy for SELECT operations
CREATE POLICY "allow read for authenticated users"
ON public.categories
FOR SELECT
USING (auth.role() = 'authenticated');

-- Create policy for INSERT operations
CREATE POLICY "allow insert for authenticated users"
ON public.categories
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Create policy for UPDATE operations
CREATE POLICY "allow update for authenticated users"
ON public.categories
FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Create policy for DELETE operations
CREATE POLICY "allow delete for authenticated users"
ON public.categories
FOR DELETE
USING (auth.role() = 'authenticated');

-- 4. Test the policies
SELECT 'RLS policies created successfully' as status;

-- 5. Check existing policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'categories';
