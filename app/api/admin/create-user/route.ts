import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    // Verify that the requesting user is an admin
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (profileError || profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Parse request body
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate password strength
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      )
    }

    // Create the user using admin client
    const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email - user can sign in immediately
    })

    if (createError) {
      console.error('Error creating user:', createError)
      return NextResponse.json(
        { error: createError.message },
        { status: 400 }
      )
    }

    if (!newUser.user) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      )
    }

    // Explicitly confirm the user's email to ensure they can sign in immediately
    const { error: confirmError } = await adminSupabase.auth.admin.updateUserById(
      newUser.user.id,
      { 
        email_confirm: true,
        // Ensure the email_confirmed_at timestamp is set
        user_metadata: {
          ...newUser.user.user_metadata,
          email_confirmed_at: new Date().toISOString()
        }
      }
    )

    if (confirmError) {
      console.error('Error confirming user email:', confirmError)
      // Don't fail the request if email confirmation fails, but log it
    }

    // The user profile will be automatically created by the database trigger
    // We can fetch it to confirm it was created
    const { data: userProfile, error: profileFetchError } = await adminSupabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', newUser.user.id)
      .single()

    if (profileFetchError) {
      console.error('Error fetching created user profile:', profileFetchError)
      // Even if we can't fetch the profile, the user was created successfully
    }

    return NextResponse.json({
      message: 'User created successfully',
      user: {
        id: newUser.user.id,
        email: newUser.user.email,
        profile: userProfile
      }
    })

  } catch (error: any) {
    console.error('Error in create-user API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
