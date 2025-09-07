import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Mock AI analysis function - replace with your actual AI API integration
async function performAIAnalysis(imageUrl: string, analysisId: string, userId: string) {
  // Simulate AI analysis that creates multiple detail records
  const analysisDetails = [
    {
      type: 'face_detection',
      description: 'Analyzing facial features and authenticity markers',
      confidence: 0.85,
      details: { faces_detected: 1, authenticity_score: 0.85 }
    },
    {
      type: 'metadata_analysis', 
      description: 'Examining image metadata for manipulation signs',
      confidence: 0.92,
      details: { exif_data_intact: true, creation_time_consistent: true }
    },
    {
      type: 'pixel_analysis',
      description: 'Detecting pixel-level inconsistencies and artifacts',
      confidence: 0.78,
      details: { artifacts_found: false, compression_analysis: 'normal' }
    },
    {
      type: 'lighting_analysis',
      description: 'Analyzing lighting consistency and shadows',
      confidence: 0.88,
      details: { lighting_consistent: true, shadow_analysis: 'natural' }
    },
    {
      type: 'edge_detection',
      description: 'Examining edge patterns for digital manipulation',
      confidence: 0.91,
      details: { unnatural_edges: false, edge_consistency: 'high' }
    }
  ]

  return analysisDetails
}

export async function POST(
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

    // Check if analysis exists and user has permission
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

    // Check if user owns the analysis or is admin
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
          error: 'Unauthorized to analyze this image' 
        },
        { status: 403 }
      )
    }

    // Set up streaming response
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial message
          const initialMessage = {
            type: 'start',
            message: 'Starting AI analysis...',
            analysisId: analysisId
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(initialMessage)}\n\n`))

          // Perform AI analysis and get detail records
          const analysisDetails = await performAIAnalysis(analysis.image_url, analysisId, user.id)

          // Process each analysis detail
          for (let i = 0; i < analysisDetails.length; i++) {
            const detail = analysisDetails[i]
            
            // Simulate processing time
            await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))

            // Create analysis detail record in database
            const { data: detailRecord, error: detailError } = await supabase
              .from('analysis_detail')
              .insert({
                analysis_id: analysisId,
                user_id: user.id,
                image_url: `${analysis.image_url}?detail=${detail.type}`, // Mock detail image URL
              })
              .select()
              .single()

            if (detailError) {
              console.error('Error creating analysis detail:', detailError)
              const errorMessage = {
                type: 'error',
                message: `Failed to save ${detail.type} analysis`,
                error: detailError.message
              }
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorMessage)}\n\n`))
              continue
            }

            // Send progress update with detail record
            const progressMessage = {
              type: 'progress',
              step: i + 1,
              total: analysisDetails.length,
              detail: {
                id: detailRecord.id,
                analysis_id: detailRecord.analysis_id,
                type: detail.type,
                description: detail.description,
                confidence: detail.confidence,
                details: detail.details,
                image_url: detailRecord.image_url,
                created_at: detailRecord.created_at
              }
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(progressMessage)}\n\n`))
          }

          // Send completion message
          const completionMessage = {
            type: 'complete',
            message: 'AI analysis completed successfully',
            analysisId: analysisId,
            totalDetails: analysisDetails.length
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(completionMessage)}\n\n`))

        } catch (error) {
          console.error('Streaming error:', error)
          const errorMessage = {
            type: 'error',
            message: 'Analysis failed',
            error: error instanceof Error ? error.message : 'Unknown error'
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorMessage)}\n\n`))
        } finally {
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })

  } catch (error) {
    console.error('Analysis API error:', error)
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
