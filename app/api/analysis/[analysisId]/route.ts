import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ analysisId: string }> }
) {
  try {
    const { analysisId } = await params
    
    // Get the Authorization header
    const authHeader = request.headers.get('authorization')
    console.log('Auth header:', authHeader)
    
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

    // Get user using the token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid or expired token' 
        },
        { status: 401 }
      )
    }

    // Get analysis with details
    const { data: analysis, error: analysisError } = await supabase
      .from('analysis')
      .select('*')
      .eq('id', analysisId)
      .single()

    if (analysisError || !analysis) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Analysis not found' 
        },
        { status: 404 }
      )
    }

    // Check if user has permission to view this analysis
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    const isAdmin = profile?.role === 'admin'
    const isOwner = analysis.user_id === user.id
    const isPublic = analysis.visibility === 'public'

    if (!isOwner && !isAdmin && !isPublic) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Unauthorized to view this analysis' 
        },
        { status: 403 }
      )
    }

    // Get analysis details
    const { data: analysisDetails, error: detailsError } = await supabase
      .from('analysis_detail')
      .select('*')
      .eq('analysis_id', analysisId)
      .order('created_at', { ascending: true })

    if (detailsError) {
      console.error('Error fetching analysis details:', detailsError)
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to fetch analysis details' 
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        analysis,
        details: analysisDetails || []
      }
    })

  } catch (error) {
    console.error('Analysis detail API error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error' 
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ analysisId: string }> }
) {
  try {
    const { analysisId } = await params
    
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

    // Get user using the token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid or expired token' 
        },
        { status: 401 }
      )
    }

    // Get analysis to check ownership and get image path
    const { data: analysis, error: analysisError } = await supabase
      .from('analysis')
      .select('*')
      .eq('id', analysisId)
      .single()

    if (analysisError || !analysis) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Analysis not found' 
        },
        { status: 404 }
      )
    }

    // Check if user has permission to delete this analysis
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    const isAdmin = profile?.role === 'admin'
    const isOwner = analysis.user_id === user.id

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Unauthorized to delete this analysis' 
        },
        { status: 403 }
      )
    }

    // Extract file path from image URL
    const imageUrl = analysis.image_url
    const urlParts = imageUrl.split('/')
    const fileName = urlParts[urlParts.length - 1]
    const userFolder = urlParts[urlParts.length - 2]
    const filePath = `${userFolder}/${fileName}`

    // Delete analysis record (cascade will delete analysis_detail records)
    const { error: deleteError } = await supabase
      .from('analysis')
      .delete()
      .eq('id', analysisId)

    if (deleteError) {
      console.error('Error deleting analysis:', deleteError)
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to delete analysis' 
        },
        { status: 500 }
      )
    }

    // Delete image from storage
    const { error: storageError } = await supabase.storage
      .from('analysis-images')
      .remove([filePath])

    if (storageError) {
      console.error('Error deleting image from storage:', storageError)
      // Don't fail the request if storage deletion fails
    }

    return NextResponse.json({
      success: true,
      message: 'Analysis deleted successfully'
    })

  } catch (error) {
    console.error('Delete analysis API error:', error)
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
      'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
