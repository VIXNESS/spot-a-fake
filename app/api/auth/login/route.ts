import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserProfile } from '@/lib/utils/auth'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Email and password are required' 
        },
        { status: 400 }
      )
    }

    // Create Supabase client
    const supabase = await createClient()

    // Attempt to sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return NextResponse.json(
        { 
          success: false,
          error: error.message 
        },
        { status: 401 }
      )
    }

    if (!data.user) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Authentication failed' 
        },
        { status: 401 }
      )
    }

    // Get user profile
    const profile = await getUserProfile(data.user.id)

    // Return success response with user data
    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: data.user.id,
          email: data.user.email,
          email_confirmed_at: data.user.email_confirmed_at,
          created_at: data.user.created_at,
          updated_at: data.user.updated_at,
        },
        profile: profile ? {
          id: profile.id,
          user_id: profile.user_id,
          role: profile.role,
          email: profile.email,
          created_at: profile.created_at,
          updated_at: profile.updated_at,
        } : null,
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at,
          expires_in: data.session.expires_in,
          token_type: data.session.token_type,
        }
      }
    })

  } catch (error) {
    console.error('Login API error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error' 
      },
      { status: 500 }
    )
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
