-- Update only the trigger function and permissions
-- This preserves existing data while fixing the trigger

-- Drop the trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop and recreate the trigger function with fixes
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Function to create user profile on signup (with fixes)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert with explicit schema and bypass RLS
    INSERT INTO public.user_profiles (user_id, email, role)
    VALUES (
        NEW.id, 
        COALESCE(NEW.email, NEW.raw_user_meta_data->>'email', 'unknown@example.com'), 
        'user'::user_role
    );
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail user creation
    RAISE LOG 'Error creating user profile for user %: % - %', NEW.id, SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO authenticated, anon, service_role;
