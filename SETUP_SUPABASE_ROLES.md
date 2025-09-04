# Supabase User Roles Setup Guide

This guide explains how to set up user roles (normal user and admin) in your Supabase project.

## 1. Environment Setup

First, create a `.env.local` file in your project root with your Supabase credentials:

```bash
# Copy from your Supabase project settings
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

You can find these values in your Supabase project dashboard under Settings > API.

## 2. Database Setup

### Step 1: Run the SQL Schema

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `lib/database/schema.sql`
4. Execute the SQL to create:
   - `user_role` enum type
   - `user_profiles` table
   - Row Level Security policies
   - Helper functions
   - Triggers for automatic profile creation

### Step 2: Understanding the Schema

The setup creates:

- **user_profiles table**: Stores user role information
- **RLS policies**: Ensures users can only access appropriate data
- **Automatic triggers**: Creates profiles when users sign up
- **Helper functions**: For role checking and management

## 3. How Roles Work

### User Roles
- **user**: Default role for new signups
- **admin**: Full access to admin dashboard and user management

### Role Assignment
1. **Default**: All new users get 'user' role
2. **First Admin**: Change the email in the trigger function to your admin email
3. **Admin Management**: Admins can promote/demote users via dashboard

## 4. Role-Based Access Control

### Middleware Protection
The middleware automatically:
- Protects `/admin/*` routes
- Redirects unauthenticated users to login
- Redirects non-admin users to unauthorized page

### Component-Level Protection
Use the `useAuth` hook in components:

```tsx
import { useAuth } from '@/contexts/AuthContext'

function AdminComponent() {
  const { isAdmin, user } = useAuth()
  
  if (!isAdmin) {
    return <div>Access denied</div>
  }
  
  return <div>Admin content</div>
}
```

### Server-Side Protection
Use auth utilities in server components:

```tsx
import { requireAdmin } from '@/lib/utils/auth'

export default async function AdminPage() {
  const { user, profile } = await requireAdmin()
  
  return <div>Welcome, Admin {user.email}</div>
}
```

## 5. Setting Up Your First Admin

### Option 1: Update the Trigger Function
1. In the SQL schema, find the `handle_new_user()` function
2. Change `admin@example.com` to your actual admin email
3. Re-run the SQL schema

### Option 2: Manual Database Update
1. Sign up with your admin account
2. Go to Supabase Dashboard > Table Editor > user_profiles
3. Find your user record and change role from 'user' to 'admin'

### Option 3: Using SQL
```sql
UPDATE user_profiles 
SET role = 'admin' 
WHERE email = 'your-admin-email@example.com';
```

## 6. Testing the Setup

1. **Start the development server**:
   ```bash
   pnpm dev
   ```

2. **Test normal user flow**:
   - Sign up with a regular email
   - Try accessing `/admin/dashboard` (should be redirected)

3. **Test admin flow**:
   - Sign up/in with admin email
   - Access `/admin/dashboard` (should work)
   - Manage user roles in the dashboard

## 7. Admin Dashboard Features

The admin dashboard (`/admin/dashboard`) provides:
- User list with roles
- Role management (promote/demote users)
- **Create new users** with email and password
- User activity overview
- Secure admin-only access

### Creating New Users

Admins can create new users through the admin dashboard:

1. **Navigate to Create User**: From the admin dashboard, click "Create User" in the navigation or use the "Create New User" button
2. **Fill the Form**: Enter the user's email address and set a password
3. **User Creation**: The system will:
   - Create the user account in Supabase Auth
   - Automatically confirm the email address
   - Assign the 'user' role by default
   - Create the user profile in the database
4. **Immediate Access**: The new user can sign in immediately with the provided credentials

**Features:**
- Password validation (minimum 6 characters)
- Email format validation
- Automatic email confirmation
- Default 'user' role assignment
- Secure admin-only access

## 8. Security Features

### Row Level Security (RLS)
- Users can only see their own profiles
- Admins can see and modify all profiles
- Automatic role validation

### Route Protection
- Middleware blocks unauthorized access
- Server-side auth validation
- Client-side role checking

### Data Validation
- Role changes are validated server-side
- Admins cannot demote themselves
- Type-safe role definitions

## 9. Customizing Roles

To add more roles:

1. **Update the enum**:
   ```sql
   ALTER TYPE user_role ADD VALUE 'moderator';
   ```

2. **Update TypeScript types**:
   ```typescript
   export type UserRole = 'user' | 'admin' | 'moderator'
   ```

3. **Update policies and middleware** as needed

## 10. Troubleshooting

### Common Issues:

1. **RLS blocking queries**: Ensure policies are set up correctly
2. **Users not getting profiles**: Check the trigger function
3. **Role changes not working**: Verify admin permissions
4. **Middleware redirects**: Check environment variables

### Debug Tips:

1. Check Supabase logs in the dashboard
2. Use browser dev tools for client-side debugging
3. Verify environment variables are loaded
4. Test with different user accounts

## 11. Production Considerations

1. **Environment Variables**: Use production Supabase credentials
2. **SSL**: Ensure HTTPS in production
3. **Rate Limiting**: Consider implementing rate limits
4. **Monitoring**: Set up logging and monitoring
5. **Backup**: Regular database backups

## Files Created

This setup creates the following files:
- `lib/supabase/client.ts` - Client-side Supabase config
- `lib/supabase/server.ts` - Server-side Supabase config  
- `lib/supabase/middleware.ts` - Route protection logic
- `lib/types/auth.ts` - TypeScript type definitions
- `lib/utils/auth.ts` - Auth utility functions
- `lib/database/schema.sql` - Database schema and policies
- `contexts/AuthContext.tsx` - React context for auth state
- `middleware.ts` - Next.js middleware
- `app/admin/login/page.tsx` - Admin login page
- `app/admin/dashboard/page.tsx` - Admin dashboard
- `app/unauthorized/page.tsx` - Unauthorized access page

Your Supabase user roles system is now ready to use!
