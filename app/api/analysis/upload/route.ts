import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserProfile } from '@/lib/utils/auth'

export async function POST(request: NextRequest) {
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

    // Get the uploaded file from form data
    const formData = await request.formData()
    const file = formData.get('image') as File
    const visibility = formData.get('visibility') as string || 'private'

    if (!file) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Image file is required' 
        },
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { 
          success: false,
          error: 'File must be an image' 
        },
        { status: 400 }
      )
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { 
          success: false,
          error: 'File size must be less than 10MB' 
        },
        { status: 400 }
      )
    }

    // Validate visibility
    if (visibility !== 'private' && visibility !== 'public') {
      return NextResponse.json(
        { 
          success: false,
          error: 'Visibility must be either "private" or "public"' 
        },
        { status: 400 }
      )
    }

    // Generate unique filename
    const timestamp = Date.now()
    const fileExtension = file.name.split('.').pop()
    const fileName = `${user.id}/${timestamp}.${fileExtension}`

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('analysis-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to upload image' 
        },
        { status: 500 }
      )
    }

    // Get the public URL for the uploaded file
    const { data: urlData } = supabase.storage
      .from('analysis-images')
      .getPublicUrl(fileName)

    // Create analysis record in database
    const { data: analysisData, error: dbError } = await supabase
      .from('analysis')
      .insert({
        user_id: user.id,
        image_url: urlData.publicUrl,
        visibility: visibility as 'private' | 'public'
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      // Clean up uploaded file if database insert fails
      await supabase.storage.from('analysis-images').remove([fileName])
      
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to create analysis record' 
        },
        { status: 500 }
      )
    }

    // Return success response with analysis data
    return NextResponse.json({
      success: true,
      data: {
        analysis: {
          id: analysisData.id,
          user_id: analysisData.user_id,
          image_url: analysisData.image_url,
          visibility: analysisData.visibility,
          created_at: analysisData.created_at,
          updated_at: analysisData.updated_at,
        }
      }
    })

  } catch (error) {
    console.error('Upload API error:', error)
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
