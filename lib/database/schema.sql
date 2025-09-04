-- Create user roles enum
CREATE TYPE user_role AS ENUM ('user', 'admin');

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    role user_role DEFAULT 'user'::user_role NOT NULL,
    email TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON user_profiles;

-- Create a function to check admin status without RLS recursion
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN AS $$
DECLARE
    user_role_result user_role;
BEGIN
    -- Use SECURITY DEFINER to bypass RLS for this check
    SELECT role INTO user_role_result 
    FROM public.user_profiles 
    WHERE user_id = auth.uid();
    
    RETURN COALESCE(user_role_result = 'admin', FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Simple policy: Users can view their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = user_id);

-- Simple policy: Users can update their own profile (excluding role changes)
CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id AND role = OLD.role);

-- Admin policy: Admins can view all profiles (using SECURITY DEFINER function)
CREATE POLICY "Admins can view all profiles" ON user_profiles
    FOR SELECT USING (public.is_admin_user());

-- Admin policy: Admins can update all profiles
CREATE POLICY "Admins can update all profiles" ON user_profiles
    FOR UPDATE USING (public.is_admin_user());

-- Admin policy: Admins can insert new profiles  
CREATE POLICY "Admins can insert profiles" ON user_profiles
    FOR INSERT WITH CHECK (public.is_admin_user());

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (user_id, email, role)
    VALUES (
        NEW.id, 
        NEW.email, 
        CASE 
            WHEN NEW.email = 'admin@example.com' THEN 'admin'::user_role 
            ELSE 'user'::user_role 
        END
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create user profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to check if user is admin (for external use)
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_role_result user_role;
BEGIN
    SELECT role INTO user_role_result 
    FROM public.user_profiles 
    WHERE user_id = user_uuid;
    
    RETURN COALESCE(user_role_result = 'admin', FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID)
RETURNS user_role AS $$
DECLARE
    user_role_result user_role;
BEGIN
    SELECT role INTO user_role_result 
    FROM public.user_profiles 
    WHERE user_id = user_uuid;
    
    RETURN COALESCE(user_role_result, 'user'::user_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
