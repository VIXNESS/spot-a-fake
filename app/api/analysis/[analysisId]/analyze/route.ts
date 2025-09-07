import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Mock AI analysis function - replace with your actual AI API integration
async function segmentImage(imageUrl: string): Promise<Array<{segment: string, coordinates: {x: number, y: number, width: number, height: number}}>> {
  // This would use an image processing library like Sharp or Canvas
  // For now, simulating segmentation of an image into parts
  
  const segments = [
    {
      segment: 'data:image/png;base64,segment1data...', // Base64 of segmented part
      coordinates: { x: 0, y: 0, width: 256, height: 256 }
    },
    {
      segment: 'data:image/png;base64,segment2data...', 
      coordinates: { x: 256, y: 0, width: 256, height: 256 }
    },
    {
      segment: 'data:image/png;base64,segment3data...', 
      coordinates: { x: 0, y: 256, width: 256, height: 256 }
    },
    {
      segment: 'data:image/png;base64,segment4data...', 
      coordinates: { x: 256, y: 256, width: 256, height: 256 }
    }
  ]
  
  return segments
}

// Call external AI API for each segment
async function callAIForSegment(segmentData: string, segmentIndex: number, coordinates: any) {
  // This would be your actual AI API call (OpenAI, Hugging Face, etc.)
  // Example with fetch to an external AI service:
  
  try {
    const response = await fetch('https://your-ai-api.com/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_AI_API_KEY'
      },
      body: JSON.stringify({
        image: segmentData,
        analysis_type: 'deepfake_detection',
        segment_info: {
          index: segmentIndex,
          coordinates: coordinates
        }
      })
    })
    
    if (!response.ok) {
      throw new Error(`AI API returned ${response.status}`)
    }
    
    const result = await response.json()
    
    return {
      segmentIndex,
      coordinates,
      confidence: result.confidence || 0.5,
      findings: result.findings || 'No specific findings',
      manipulationDetected: result.manipulation_detected || false,
      processingTime: result.processing_time_ms || 1000
    }
  } catch (error) {
    console.error(`Error analyzing segment ${segmentIndex}:`, error)
    // Return a fallback result instead of throwing
    return {
      segmentIndex,
      coordinates,
      confidence: 0.0,
      findings: `Error analyzing segment: ${error instanceof Error ? error.message : 'Unknown error'}`,
      manipulationDetected: false,
      processingTime: 0,
      error: true
    }
  }
}

// Call YOLO API for object detection and pose analysis
async function callYOLOAPI(imageData: string) {
  try {
    // Convert base64 image data to form data
    const formData = new FormData();
    const blob = await fetch(imageData).then(r => r.blob());
    formData.append('file', blob);

    const response = await fetch(process.env.YOLO_API_URL + '/api/v1/detect', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`YOLO API returned ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || 'YOLO API analysis failed');
    }

    return {
      detections: result.detections.map((detection: any) => ({
        confidence: detection.confidence,
        box: detection.box,
        type: detection.type,
        classId: detection.class_id,
        pose: detection.pose ? {
          keypoints: detection.pose.keypoints.xy.map((point: number[]) => ({
            x: point[0],
            y: point[1]
          }))
        } : null
      })),
      count: result.count,
      processingTime: result.processing_time_ms || 0
    };

  } catch (error) {
    console.error('Error calling YOLO API:', error);
    return {
      detections: [],
      count: 0,
      processingTime: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}


// Helper function to crop image based on detection box
async function cropImageByBox(imageUrl: string, box: number[]): Promise<string> {
  // This would use an image processing library like Sharp or Canvas
  // For now, simulating cropped image generation
  // box format: [x1, y1, x2, y2]
  
  const [x1, y1, x2, y2] = box
  const width = x2 - x1
  const height = y2 - y1
  
  // Mock cropped image data - in real implementation, use Sharp/Canvas to crop
  const croppedImageData = `data:image/png;base64,cropped_segment_${x1}_${y1}_${width}_${height}_data...`
  
  return croppedImageData
}

// Helper function to segment human image into clothing parts using Segformer API
async function segmentHumanImage(croppedHumanImage: string, originalBox: number[]): Promise<Array<{segment: string, coordinates: {x: number, y: number, width: number, height: number}}>> {
  try {
    const segformerApiUrl = process.env.SEGFORMER_API_URL || 'http://localhost:8100'
    
    // Convert base64 image to blob for FormData
    const base64Data = croppedHumanImage.replace(/^data:image\/[a-z]+;base64,/, '')
    const imageBuffer = Buffer.from(base64Data, 'base64')
    
    // Create FormData for the API request
    const formData = new FormData()
    const blob = new Blob([imageBuffer], { type: 'image/png' })
    formData.append('file', blob, 'human_image.png')
    formData.append('include_individual_masks', 'true')
    formData.append('fill_holes', 'true')
    
    // Call Segformer API
    const response = await fetch(`${segformerApiUrl}/api/v1/segment`, {
      method: 'POST',
      body: formData,
    })
    
    if (!response.ok) {
      throw new Error(`Segformer API failed: ${response.status} ${response.statusText}`)
    }
    
    const segmentationResult = await response.json()
    
    // Process the segmentation results
    const segments = []
    const [x1, y1, x2, y2] = originalBox
    
    // Extract detected clothing items from Segformer response
    if (segmentationResult.segmentation_result?.detected_items) {
      for (let i = 0; i < segmentationResult.segmentation_result.detected_items.length; i++) {
        const item = segmentationResult.segmentation_result.detected_items[i]
        
        // Filter for clothing and body parts (exclude background)
        if (item.label_id > 0 && item.percentage > 1.0) { // Minimum 1% coverage
          segments.push({
            segment: `data:image/png;base64,${segmentationResult.segmentation_result.combined_mask.mask_base64}`,
            coordinates: {
              x: x1,
              y: y1,
              width: x2 - x1,
              height: y2 - y1
            }
          })
        }
      }
    }
    
    // If no valid segments found, return a fallback segment
    if (segments.length === 0) {
      console.log('No clothing segments detected, using full human area as fallback')
      segments.push({
        segment: croppedHumanImage,
        coordinates: {
          x: x1,
          y: y1,
          width: x2 - x1,
          height: y2 - y1
        }
      })
    }
    
    console.log(`Segformer API detected ${segments.length} clothing segments`)
    return segments
    
  } catch (error) {
    console.error('Error calling Segformer API:', error)
    
    // Fallback to simple segmentation if API fails
    const [x1, y1, x2, y2] = originalBox
    const humanWidth = x2 - x1
    const humanHeight = y2 - y1
    
    console.log('Using fallback segmentation approach')
    return [
      {
        segment: croppedHumanImage,
        coordinates: { 
          x: x1, 
          y: y1, 
          width: humanWidth, 
          height: humanHeight
        }
      }
    ]
  }
}

// Modified AI analysis function
async function performAIAnalysis(imageUrl: string, analysisId: string, userId: string) {

  // Step 1: Call YOLO API for object detection
  const yoloResults = await callYOLOAPI(imageUrl)
  
  if (yoloResults.error) {
    console.error('YOLO API failed:', yoloResults.error)
    // Fallback to original segmentation approach
    const segments = await segmentImage(imageUrl)
    return await processSegments(segments, 'fallback_segmentation')
  }

  // Step 2: Process all detections with sufficient confidence
  const validDetections = yoloResults.detections.filter((detection: any) => 
    detection.confidence >= 0.6 // Lower threshold for all objects
  )

  if (validDetections.length === 0) {
    console.log('No valid detections found')
    return []
  }

  // Step 3: Process each detection based on type
  const segmentResults = []
  
  for (let i = 0; i < validDetections.length; i++) {
    const detection = validDetections[i]
    
    if (detection.type === 'person') {
      // Human detected: segment the human area into parts
      console.log(`Processing human detection ${i + 1}`)
      
      // Crop image to detection box
      const croppedHumanImage = await cropImageByBox(imageUrl, detection.box)
      
      // Segment the cropped human image into parts (similar to original segmentImage)
      const humanSegments = await segmentHumanImage(croppedHumanImage, detection.box)
      
      // Process each human segment part
      for (let j = 0; j < humanSegments.length; j++) {
        const humanSegment = humanSegments[j]
        
        // Analyze each human segment part
        const aiResult = await callAIForSegment(humanSegment.segment, parseInt(`${i}${j}`), humanSegment.coordinates)
        
        // Create analysis detail for this human segment part
        const analysisDetail = {
          type: `human_segment_${i + 1}_part_${j + 1}`,
          description: `Analysis of human ${i + 1} segment part ${j + 1} (confidence: ${(detection.confidence * 100).toFixed(1)}%) - ${aiResult.findings}`,
          confidence: aiResult.confidence,
          imageData: humanSegment.segment,
          metadata: {
            segmentIndex: `${i}_${j}`,
            coordinates: humanSegment.coordinates,
            manipulationDetected: aiResult.manipulationDetected,
            processingTime: aiResult.processingTime,
            hasError: aiResult.error || false,
            yoloDetection: {
              confidence: detection.confidence,
              box: detection.box,
              classId: detection.classId,
              pose: detection.pose,
              parentDetectionIndex: i,
              segmentPartIndex: j
            }
          }
        }
        
        segmentResults.push(analysisDetail)
      }
    } else {
      // Non-human detected: add directly without segmentation
      console.log(`Processing non-human detection: ${detection.type}`)
      
      // Crop image to detection box
      const croppedImage = await cropImageByBox(imageUrl, detection.box)
      
      // Analyze the non-human detection directly (no further segmentation)
      const aiResult = await callAIForSegment(croppedImage, i, {
        x: detection.box[0],
        y: detection.box[1], 
        width: detection.box[2] - detection.box[0],
        height: detection.box[3] - detection.box[1]
      })
      
      // Create analysis detail for this non-human detection
      const analysisDetail = {
        type: `${detection.type}_detection_${i + 1}`,
        description: `Analysis of detected ${detection.type} (confidence: ${(detection.confidence * 100).toFixed(1)}%) - ${aiResult.findings}`,
        confidence: aiResult.confidence,
        imageData: croppedImage,
        metadata: {
          segmentIndex: i,
          coordinates: {
            x: detection.box[0],
            y: detection.box[1], 
            width: detection.box[2] - detection.box[0],
            height: detection.box[3] - detection.box[1]
          },
          manipulationDetected: aiResult.manipulationDetected,
          processingTime: aiResult.processingTime,
          hasError: aiResult.error || false,
          yoloDetection: {
            confidence: detection.confidence,
            box: detection.box,
            classId: detection.classId,
            pose: detection.pose
          }
        }
      }
      
      segmentResults.push(analysisDetail)
    }
  }
  
  return segmentResults
}

// Helper function to process segments (for fallback)
async function processSegments(segments: any[], analysisType: string) {
  const segmentResults = []
  
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
    
    // Call AI API for this specific segment
    const aiResult = await callAIForSegment(segment.segment, i, segment.coordinates)
    
    // Create analysis detail for this segment
    const analysisDetail = {
      type: `${analysisType}_${i + 1}`,
      description: `Analysis of image segment ${i + 1} (${segment.coordinates.x},${segment.coordinates.y}) - ${aiResult.findings}`,
      confidence: aiResult.confidence,
      imageData: segment.segment,
      metadata: {
        segmentIndex: i,
        coordinates: segment.coordinates,
        manipulationDetected: aiResult.manipulationDetected,
        processingTime: aiResult.processingTime,
        hasError: aiResult.error || false
      }
    }
    
    segmentResults.push(analysisDetail)
  }
  
  return segmentResults
}

async function generateAISummary(analysisDetails: Array<{type: string, description: string, confidence: number, imageData: string}>) {
  // Calculate overall confidence score
  const averageConfidence = analysisDetails.reduce((sum, detail) => sum + detail.confidence, 0) / analysisDetails.length
  
  // Determine authenticity assessment based on confidence levels
  let authenticityAssessment: string
  let overallResult: 'authentic' | 'suspicious' | 'likely_fake'
  
  if (averageConfidence >= 0.85) {
    authenticityAssessment = "High confidence that the image is authentic. All analysis components show consistent patterns typical of genuine content."
    overallResult = 'authentic'
  } else if (averageConfidence >= 0.70) {
    authenticityAssessment = "Moderate confidence with some areas of concern. The image shows mixed indicators that warrant further investigation."
    overallResult = 'suspicious'
  } else {
    authenticityAssessment = "Low confidence - significant concerns detected. Multiple analysis components indicate potential manipulation or synthetic generation."
    overallResult = 'likely_fake'
  }

  // Generate detailed summary text
  const highConfidenceAreas = analysisDetails.filter(d => d.confidence >= 0.85).map(d => d.type)
  const lowConfidenceAreas = analysisDetails.filter(d => d.confidence < 0.75).map(d => d.type)
  
  let detailedSummary = `Overall Analysis Summary:\n\n${authenticityAssessment}\n\n`
  
  if (highConfidenceAreas.length > 0) {
    detailedSummary += `Strong indicators (high confidence): ${highConfidenceAreas.join(', ')}\n`
  }
  
  if (lowConfidenceAreas.length > 0) {
    detailedSummary += `Areas of concern (low confidence): ${lowConfidenceAreas.join(', ')}\n`
  }
  
  detailedSummary += `\nAverage confidence score: ${(averageConfidence * 100).toFixed(1)}%`
  
  return {
    overallResult,
    confidence: averageConfidence,
    summary: detailedSummary,
    authenticityAssessment
  }
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
            const detail = analysisDetails[i] // This is now a segment result
            
            // The segment has already been analyzed by AI
            // No additional processing time needed since AI call was already made
            
            // Upload the segment image to storage
            let imageUrl = ''
            try {
              const base64Data = detail.imageData.split(',')[1]
              const imageBuffer = Buffer.from(base64Data, 'base64')
              
              const fileName = `${analysisId}/segment_${detail.metadata.segmentIndex}_${Date.now()}.png`
              
              // Upload to Supabase Storage
              const { data: uploadData, error: uploadError } = await supabase.storage
                .from('analysis-images')
                .upload(fileName, imageBuffer, {
                  contentType: 'image/png',
                  cacheControl: '3600'
                })

              if (uploadError) {
                console.error('Error uploading image to storage:', uploadError)
                throw new Error(`Failed to upload ${detail.type} image: ${uploadError.message}`)
              }

              // Get public URL
              const { data: publicUrlData } = supabase.storage
                .from('analysis-images')
                .getPublicUrl(uploadData.path)
              
              imageUrl = publicUrlData.publicUrl
            } catch (storageError) {
              console.error('Storage error:', storageError)
              const errorMessage = {
                type: 'error',
                message: `Failed to save ${detail.type} image`,
                error: storageError instanceof Error ? storageError.message : 'Storage error'
              }
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorMessage)}\n\n`))
              continue
            }

            // Save to database with segment-specific information
            const { data: detailRecord, error: detailError } = await supabase
              .from('analysis_detail')
              .insert({
                analysis_id: analysisId,
                user_id: user.id,
                image_url: imageUrl,
                ai_confidence: detail.confidence,
                ai_result_text: JSON.stringify({
                  type: detail.type,
                  description: detail.description,
                  confidence: detail.confidence,
                  segmentInfo: detail.metadata // Store segment coordinates and AI findings
                })
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

            // Stream progress with segment-specific data
            const progressMessage = {
              type: 'progress',
              step: i + 1,
              total: analysisDetails.length,
              detail: {
                id: detailRecord.id,
                type: detail.type,
                description: detail.description,
                confidence: detail.confidence,
                segmentIndex: detail.metadata.segmentIndex,
                coordinates: detail.metadata.coordinates,
                manipulationDetected: detail.metadata.manipulationDetected
              }
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(progressMessage)}\n\n`))
          }

          // Generate AI summary after all details are processed
          const summaryMessage = {
            type: 'summary_progress',
            message: 'Generating overall analysis summary...'
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(summaryMessage)}\n\n`))

          // Simulate summary generation time
          await new Promise(resolve => setTimeout(resolve, 1500))

          const aiSummary = await generateAISummary(analysisDetails)

          // Update the main analysis record with the summary
          const { error: updateError } = await supabase
            .from('analysis')
            .update({
              ai_confidence: aiSummary.confidence,
              ai_result_text: aiSummary.summary
            })
            .eq('id', analysisId)

          if (updateError) {
            console.error('Error updating analysis with summary:', updateError)
            const errorMessage = {
              type: 'error',
              message: 'Failed to save analysis summary',
              error: updateError.message
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorMessage)}\n\n`))
          } else {
            // Send summary results
            const summaryResultMessage = {
              type: 'summary_complete',
              summary: aiSummary,
              message: 'Analysis summary saved successfully'
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(summaryResultMessage)}\n\n`))
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
