import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserProfile } from '@/lib/utils/auth'

export async function POST(request: NextRequest) {
  try {
    const { refresh_token } = await request.json()

    // Validate input
    if (!refresh_token) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Refresh token is required' 
        },
        { status: 400 }
      )
    }

    // Create Supabase client
    const supabase = await createClient()

    // Refresh the session
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token
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

    if (!data.user || !data.session) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to refresh session' 
        },
        { status: 401 }
      )
    }

    // Get user profile
    const profile = await getUserProfile(data.user.id)

    // Return success response with refreshed data
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
    console.error('Refresh API error:', error)
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
