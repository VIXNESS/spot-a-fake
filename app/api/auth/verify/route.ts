import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserProfile } from '@/lib/utils/auth'

export async function GET(request: NextRequest) {
  try {
    // Get the Authorization header
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Authorization header with Bearer token is required' 
        },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix

    // Create Supabase client
    const supabase = await createClient()

    // Verify the token by getting user
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid or expired token' 
        },
        { status: 401 }
      )
    }

    // Get user profile
    const profile = await getUserProfile(user.id)

    // Return success response with user data
    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          email_confirmed_at: user.email_confirmed_at,
          created_at: user.created_at,
          updated_at: user.updated_at,
        },
        profile: profile ? {
          id: profile.id,
          user_id: profile.user_id,
          role: profile.role,
          email: profile.email,
          created_at: profile.created_at,
          updated_at: profile.updated_at,
        } : null,
        valid: true
      }
    })

  } catch (error) {
    console.error('Verify API error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error' 
      },
      { status: 500 }
    )
  }
}

// Handle POST for token verification with token in body
export async function POST(request: NextRequest) {
  try {
    const { access_token } = await request.json()

    // Validate input
    if (!access_token) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Access token is required' 
        },
        { status: 400 }
      )
    }

    // Create Supabase client
    const supabase = await createClient()

    // Verify the token by getting user
    const { data: { user }, error } = await supabase.auth.getUser(access_token)

    if (error || !user) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid or expired token' 
        },
        { status: 401 }
      )
    }

    // Get user profile
    const profile = await getUserProfile(user.id)

    // Return success response with user data
    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          email_confirmed_at: user.email_confirmed_at,
          created_at: user.created_at,
          updated_at: user.updated_at,
        },
        profile: profile ? {
          id: profile.id,
          user_id: profile.user_id,
          role: profile.role,
          email: profile.email,
          created_at: profile.created_at,
          updated_at: profile.updated_at,
        } : null,
        valid: true
      }
    })

  } catch (error) {
    console.error('Verify API error:', error)
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
