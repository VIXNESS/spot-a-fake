import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'


// Analyze image for luxury brands
async function analyzeLuxuryImage(imageUrl: string): Promise<{
  confident: number,
  brand: string | null,
  product: string | null
}> {
  try {
    const response = await fetch(`${process.env.LLM_API_URL}/api/v1/analyze-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      body: JSON.stringify({
        file: imageUrl
      })
    });

    if (!response.ok) {
      throw new Error(`Luxury analysis API returned ${response.status}`);
    }

    const result = await response.json();

    return {
      confident: result.confident || 0,
      brand: result.brand || null, 
      product: result.product || null
    };

  } catch (error) {
    console.error('Error analyzing luxury image:', error);
    return {
      confident: 0,
      brand: null,
      product: null
    };
  }
}


// Analyze image for fake goods detection (standard non-streaming version)
async function detectFakeGoods(imageBase64: string, brandName: string): Promise<{
  authentic_probability: number,
  confidence_level: string,
  key_findings: string[],
  red_flags: string[],
  authentic_indicators: string[],
  overall_assessment: string,
  recommendation: string
}> {
  try {
    const response = await fetch(`${process.env.LLM_API_URL}/api/v1/detect-fake-goods`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        image_base64: imageBase64,
        brand_name: brandName
      })
    });

    if (!response.ok) {
      throw new Error(`Fake goods detection API returned ${response.status}`);
    }

    const result = await response.json();

    return {
      authentic_probability: result.authentic_probability || 0,
      confidence_level: result.confidence_level || 'low',
      key_findings: result.key_findings || [],
      red_flags: result.red_flags || [],
      authentic_indicators: result.authentic_indicators || [],
      overall_assessment: result.overall_assessment || '',
      recommendation: result.recommendation || ''
    };

  } catch (error) {
    console.error('Error detecting fake goods:', error);
    return {
      authentic_probability: 0,
      confidence_level: 'low',
      key_findings: [],
      red_flags: [`Error analyzing authenticity: ${error instanceof Error ? error.message : 'Unknown error'}`],
      authentic_indicators: [],
      overall_assessment: 'Analysis failed',
      recommendation: 'Unable to verify authenticity due to technical error'
    };
  }
}

// Streaming version of fake goods detection with real-time progress updates
async function detectFakeGoodsStreaming(
  imageBase64: string, 
  brandName: string,
  onProgress: (chunk: string) => void
): Promise<{
  authentic_probability: number,
  confidence_level: string,
  key_findings: string[],
  red_flags: string[],
  authentic_indicators: string[],
  overall_assessment: string,
  recommendation: string
}> {
  try {
    const response = await fetch(`${process.env.LLM_API_URL}/api/v1/detect-fake-goods/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify({
        image_base64: imageBase64,
        brand_name: brandName
      })
    });

    if (!response.ok) {
      throw new Error(`Streaming fake goods detection API returned ${response.status}`);
    }

    if (!response.body) {
      throw new Error('Response body is not available for streaming');
    }

    // Process the streaming response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullAnalysisText = '';
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }

        // Decode the chunk and add to buffer
        buffer += decoder.decode(value, { stream: true });
        
        // Process complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6); // Remove 'data: ' prefix
            
            if (data.trim() === '[DONE]') {
              // End of stream
              continue;
            }
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              
              if (content) {
                fullAnalysisText += content;
                // Send real-time progress update
                onProgress(content);
              }
            } catch (parseError) {
              // Skip malformed JSON chunks
              console.warn('Failed to parse streaming chunk:', parseError);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    // Parse the final accumulated analysis text to extract structured data
    // This is a simplified parser - in production, you might want more robust parsing
    const analysisResult = parseStreamingAnalysisResult(fullAnalysisText, brandName);
    
    return analysisResult;

  } catch (error) {
    console.error('Error in streaming fake goods detection:', error);
    return {
      authentic_probability: 0,
      confidence_level: 'low',
      key_findings: [],
      red_flags: [`Streaming analysis error: ${error instanceof Error ? error.message : 'Unknown error'}`],
      authentic_indicators: [],
      overall_assessment: 'Streaming analysis failed',
      recommendation: 'Unable to verify authenticity due to streaming error'
    };
  }
}



// Helper function to parse streaming analysis result into structured format
function parseStreamingAnalysisResult(analysisText: string, brandName: string): {
  authentic_probability: number,
  confidence_level: string,
  key_findings: string[],
  red_flags: string[],
  authentic_indicators: string[],
  overall_assessment: string,
  recommendation: string
} {
  // Extract key information from the analysis text using simple pattern matching
  // This is a basic implementation - you might want to make this more sophisticated
  
  const lowerText = analysisText.toLowerCase();
  
  // Estimate authenticity probability based on positive/negative indicators
  let authentic_probability = 0.5; // Default neutral
  const positiveWords = ['authentic', 'genuine', 'real', 'legitimate', 'quality', 'correct', 'proper'];
  const negativeWords = ['fake', 'counterfeit', 'replica', 'suspicious', 'poor', 'incorrect', 'wrong'];
  
  let positiveCount = 0;
  let negativeCount = 0;
  
  positiveWords.forEach(word => {
    const count = (lowerText.match(new RegExp(word, 'g')) || []).length;
    positiveCount += count;
  });
  
  negativeWords.forEach(word => {
    const count = (lowerText.match(new RegExp(word, 'g')) || []).length;
    negativeCount += count;
  });
  
  if (positiveCount > negativeCount) {
    authentic_probability = Math.min(0.95, 0.5 + (positiveCount - negativeCount) * 0.1);
  } else if (negativeCount > positiveCount) {
    authentic_probability = Math.max(0.05, 0.5 - (negativeCount - positiveCount) * 0.1);
  }
  
  // Determine confidence level
  let confidence_level = 'medium';
  if (Math.abs(positiveCount - negativeCount) >= 3) {
    confidence_level = 'high';
  } else if (Math.abs(positiveCount - negativeCount) <= 1) {
    confidence_level = 'low';
  }
  
  // Extract key findings, red flags, and authentic indicators
  // This is a simplified extraction - you might want more sophisticated NLP
  const sentences = analysisText.split('.').map(s => s.trim()).filter(s => s.length > 10);
  
  const key_findings: string[] = [];
  const red_flags: string[] = [];
  const authentic_indicators: string[] = [];
  
  sentences.forEach(sentence => {
    const lowerSentence = sentence.toLowerCase();
    
    if (negativeWords.some(word => lowerSentence.includes(word))) {
      red_flags.push(sentence);
    } else if (positiveWords.some(word => lowerSentence.includes(word))) {
      authentic_indicators.push(sentence);
    } else if (sentence.length > 20) {
      key_findings.push(sentence);
    }
  });
  
  // Limit arrays to reasonable sizes
  const maxItems = 5;
  key_findings.splice(maxItems);
  red_flags.splice(maxItems);
  authentic_indicators.splice(maxItems);
  
  // Generate recommendation
  let recommendation = 'Proceed with caution and additional verification';
  if (authentic_probability >= 0.8) {
    recommendation = 'Likely authentic - high confidence in genuineness';
  } else if (authentic_probability <= 0.3) {
    recommendation = 'High risk of counterfeit - recommend avoiding purchase';
  }
  
  return {
    authentic_probability: Math.round(authentic_probability * 10000) / 10000,
    confidence_level,
    key_findings: key_findings.length > 0 ? key_findings : [`Analyzed ${brandName} product characteristics`],
    red_flags: red_flags.length > 0 ? red_flags : [],
    authentic_indicators: authentic_indicators.length > 0 ? authentic_indicators : [],
    overall_assessment: analysisText.substring(0, 500) + (analysisText.length > 500 ? '...' : ''),
    recommendation
  };
}

async function translateText(text: string, sourceLang: string = 'English', targetLang: string = 'Chinese'): Promise<{
  original_text: string,
  translated_text: string, 
  source_language: string,
  target_language: string
}> {
  try {
    const response = await fetch(`${process.env.LLM_API_URL}/api/v1/translate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text,
        source_language: sourceLang,
        target_language: targetLang
      })
    });

    if (!response.ok) {
      throw new Error(`Translation API returned ${response.status}`);
    }

    const result = await response.json();

    return {
      original_text: result.original_text || text,
      translated_text: result.translated_text || '',
      source_language: result.source_language || sourceLang,
      target_language: result.target_language || targetLang
    };

  } catch (error) {
    console.error('Error translating text:', error);
    return {
      original_text: text,
      translated_text: `Translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      source_language: sourceLang,
      target_language: targetLang
    };
  }
}


// Streaming summarization for multiple texts
async function summarizeTextsStreaming(
  texts: string[],
  onProgress: (chunk: string) => void
): Promise<{
  full_summary: string
}> {
  try {
    // Basic validation to avoid unnecessary requests
    const validTexts = (texts || []).map(t => (t || '').trim()).filter(t => t.length > 0)
    if (validTexts.length === 0) {
      throw new Error('No valid texts provided for summarization')
    }

    const response = await fetch(`${process.env.LLM_API_URL}/api/v1/summarize-texts/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify({ texts: validTexts })
    })

    if (!response.ok) {
      throw new Error(`Summarization streaming API returned ${response.status}`)
    }

    if (!response.body) {
      throw new Error('Response body is not available for streaming')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let fullSummary = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)

          const trimmed = data.trim()
          if (trimmed === '[DONE]') {
            // End of stream
            continue
          }

          try {
            const parsed = JSON.parse(data)
            const content: unknown = parsed?.content
            if (typeof content === 'string' && content.length > 0) {
              fullSummary += content
              onProgress(content)
            }
          } catch (e) {
            // Non-JSON or malformed chunk; ignore safely
            // Optionally, you could pass through raw text
          }
        }
      }
    } finally {
      reader.releaseLock()
    }

    return { full_summary: fullSummary }
  } catch (error) {
    console.error('Error in summarizeTextsStreaming:', error)
    return { full_summary: '' }
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

// Helper function to convert image URL to base64
async function imageUrlToBase64(imageUrl: string): Promise<string> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    return `data:image/jpeg;base64,${base64}`;
  } catch (error) {
    console.error('Error converting image to base64:', error);
    throw error;
  }
}

// Function that processes an image through the complete analysis pipeline
// Usage example:
// const result = await processImageAnalysis('https://example.com/image.jpg', 'analysis-uuid', 'user-uuid');
// This function returns data ready to insert into the analysis_detail table
async function processImageAnalysis(imageUrl: string, analysisId: string, userId: string): Promise<{
  analysis_id: string,
  user_id: string,
  image_url: string,
  ai_confidence: number,
  ai_result_text: string
}> {
  try {
    // Step 1: Analyze luxury image to identify brand and product
    console.log('Step 1: Analyzing luxury image...');
    const luxuryAnalysis = await analyzeLuxuryImage(imageUrl);
    
    // Step 2: Convert image to base64 for fake goods detection
    console.log('Step 2: Converting image to base64...');
    const imageBase64 = await imageUrlToBase64(imageUrl);
    
    // Step 3: Detect fake goods using the brand from luxury analysis
    console.log('Step 3: Detecting fake goods...');
    const brandName = luxuryAnalysis.brand || 'Unknown Brand';
    const fakeGoodsAnalysis = await detectFakeGoods(imageBase64, brandName);
    
    // Step 4: Translate the overall assessment to Chinese
    console.log('Step 4: Translating results...');
    const translationResult = await translateText(
      fakeGoodsAnalysis.overall_assessment,
      'English',
      'Chinese'
    );
    
    // Step 5: Compile comprehensive result
    const comprehensiveResult = {
      luxury_analysis: {
        confidence: luxuryAnalysis.confident,
        brand: luxuryAnalysis.brand,
        product: luxuryAnalysis.product
      },
      authenticity_analysis: {
        authentic_probability: fakeGoodsAnalysis.authentic_probability,
        confidence_level: fakeGoodsAnalysis.confidence_level,
        key_findings: fakeGoodsAnalysis.key_findings,
        red_flags: fakeGoodsAnalysis.red_flags,
        authentic_indicators: fakeGoodsAnalysis.authentic_indicators,
        overall_assessment: fakeGoodsAnalysis.overall_assessment,
        recommendation: fakeGoodsAnalysis.recommendation
      },
      translation: {
        original_text: translationResult.original_text,
        translated_text: translationResult.translated_text,
        source_language: translationResult.source_language,
        target_language: translationResult.target_language
      }
    };
    
    // Calculate overall confidence score (average of luxury confidence and authenticity probability)
    const overallConfidence = (luxuryAnalysis.confident + fakeGoodsAnalysis.authentic_probability) / 2;
    
    // Return data structure matching analysis_detail schema
    return {
      analysis_id: analysisId,
      user_id: userId,
      image_url: imageUrl,
      ai_confidence: Math.round(overallConfidence * 10000) / 10000, // Round to 4 decimal places
      ai_result_text: JSON.stringify(comprehensiveResult)
    };
    
  } catch (error) {
    console.error('Error in processImageAnalysis:', error);
    
    // Return error result in schema format
    return {
      analysis_id: analysisId,
      user_id: userId,
      image_url: imageUrl,
      ai_confidence: 0.0000,
      ai_result_text: JSON.stringify({
        error: true,
        message: `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        luxury_analysis: { confidence: 0, brand: null, product: null },
        authenticity_analysis: {
          authentic_probability: 0,
          confidence_level: 'low',
          key_findings: [],
          red_flags: [`Error during analysis: ${error instanceof Error ? error.message : 'Unknown error'}`],
          authentic_indicators: [],
          overall_assessment: 'Analysis failed due to technical error',
          recommendation: 'Unable to verify authenticity'
        },
        translation: {
          original_text: 'Analysis failed',
          translated_text: '分析失败',
          source_language: 'English',
          target_language: 'Chinese'
        }
      })
    };
  }
}

// Streaming version of image analysis pipeline that sends real-time updates
async function processImageAnalysisStreaming(
  imageUrl: string, 
  analysisId: string, 
  userId: string,
  onProgress: (step: string, message: string, data?: any) => void
): Promise<{
  analysis_id: string,
  user_id: string,
  image_url: string,
  ai_confidence: number,
  ai_result_text: string
}> {
  try {
    // Step 1: Analyze luxury image to identify brand and product
    onProgress('luxury_analysis', 'Analyzing luxury image to identify brand and product...');
    const luxuryAnalysis = await analyzeLuxuryImage(imageUrl);
    onProgress('luxury_analysis_complete', 'Luxury analysis complete', { 
      brand: luxuryAnalysis.brand, 
      confidence: luxuryAnalysis.confident 
    });
    
    // Step 2: Convert image to base64 for fake goods detection
    onProgress('image_conversion', 'Converting image to base64 format...');
    const imageBase64 = await imageUrlToBase64(imageUrl);
    onProgress('image_conversion_complete', 'Image conversion complete');
    
    // Step 3: Detect fake goods using the brand from luxury analysis (with streaming)
    const brandName = luxuryAnalysis.brand || 'Unknown Brand';
    onProgress('fake_goods_analysis', `Starting authenticity analysis for ${brandName}...`);
    
    const fakeGoodsAnalysis = await detectFakeGoodsStreaming(
      imageBase64, 
      brandName,
      (chunk: string) => {
        // Stream real-time analysis content
        onProgress('fake_goods_streaming', chunk);
      }
    );
    
    onProgress('fake_goods_analysis_complete', 'Authenticity analysis complete', {
      authentic_probability: fakeGoodsAnalysis.authentic_probability,
      confidence_level: fakeGoodsAnalysis.confidence_level
    });
    
    // Step 4: Translate the overall assessment to Chinese
    onProgress('translation', 'Translating analysis results to Chinese...');
    const translationResult = await translateText(
      fakeGoodsAnalysis.overall_assessment,
      'English',
      'Chinese'
    );
    onProgress('translation_complete', 'Translation complete');
    
    // Step 5: Compile comprehensive result
    onProgress('compilation', 'Compiling final analysis results...');
    const comprehensiveResult = {
      luxury_analysis: {
        confidence: luxuryAnalysis.confident,
        brand: luxuryAnalysis.brand,
        product: luxuryAnalysis.product
      },
      authenticity_analysis: {
        authentic_probability: fakeGoodsAnalysis.authentic_probability,
        confidence_level: fakeGoodsAnalysis.confidence_level,
        key_findings: fakeGoodsAnalysis.key_findings,
        red_flags: fakeGoodsAnalysis.red_flags,
        authentic_indicators: fakeGoodsAnalysis.authentic_indicators,
        overall_assessment: fakeGoodsAnalysis.overall_assessment,
        recommendation: fakeGoodsAnalysis.recommendation
      },
      translation: {
        original_text: translationResult.original_text,
        translated_text: translationResult.translated_text,
        source_language: translationResult.source_language,
        target_language: translationResult.target_language
      }
    };
    
    // Calculate overall confidence score (average of luxury confidence and authenticity probability)
    const overallConfidence = (luxuryAnalysis.confident + fakeGoodsAnalysis.authentic_probability) / 2;
    
    onProgress('compilation_complete', 'Analysis pipeline complete', {
      overall_confidence: overallConfidence,
      final_result: comprehensiveResult
    });
    
    // Return data structure matching analysis_detail schema
    return {
      analysis_id: analysisId,
      user_id: userId,
      image_url: imageUrl,
      ai_confidence: Math.round(overallConfidence * 10000) / 10000, // Round to 4 decimal places
      ai_result_text: JSON.stringify(comprehensiveResult)
    };
    
  } catch (error) {
    console.error('Error in streaming processImageAnalysis:', error);
    onProgress('error', `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    // Return error result in schema format
    return {
      analysis_id: analysisId,
      user_id: userId,
      image_url: imageUrl,
      ai_confidence: 0.0000,
      ai_result_text: JSON.stringify({
        error: true,
        message: `Streaming analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        luxury_analysis: { confidence: 0, brand: null, product: null },
        authenticity_analysis: {
          authentic_probability: 0,
          confidence_level: 'low',
          key_findings: [],
          red_flags: [`Error during streaming analysis: ${error instanceof Error ? error.message : 'Unknown error'}`],
          authentic_indicators: [],
          overall_assessment: 'Streaming analysis failed due to technical error',
          recommendation: 'Unable to verify authenticity'
        },
        translation: {
          original_text: 'Analysis failed',
          translated_text: '分析失败',
          source_language: 'English',
          target_language: 'Chinese'
        }
      })
    };
  }
}



// Modified AI analysis function
async function performAIAnalysis(imageUrl: string, analysisId: string, userId: string) {

  // Step 1: Call YOLO API for object detection
  const yoloResults = await callYOLOAPI(imageUrl)
  
  if (yoloResults.error) {
    console.error('YOLO API failed:', yoloResults.error)
    return []
  }

  // Step 2: Process all detections with sufficient confidence
  const validDetections = yoloResults.detections.filter((detection: any) => 
    detection.confidence >= 0.62 // Lower threshold for all objects
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
        const aiResult = await processImageAnalysis(humanSegment.segment, analysisId, userId)
        
        // Parse the AI result from processImageAnalysis
        const aiResultData = JSON.parse(aiResult.ai_result_text)
        
        // Create analysis detail for this human segment part
        const analysisDetail = {
          type: `human_segment_${i + 1}_part_${j + 1}`,
          description: `Analysis of human ${i + 1} segment part ${j + 1} (confidence: ${(detection.confidence * 100).toFixed(1)}%) - ${aiResultData.authenticity_analysis?.overall_assessment || 'Analysis completed'}`,
          confidence: aiResult.ai_confidence,
          imageData: humanSegment.segment,
          metadata: {
            segmentIndex: `${i}_${j}`,
            coordinates: humanSegment.coordinates,
            manipulationDetected: aiResultData.authenticity_analysis?.authentic_probability < 0.5,
            processingTime: 1000, // Default processing time
            hasError: aiResultData.error || false,
            yoloDetection: {
              confidence: detection.confidence,
              box: detection.box,
              classId: detection.classId,
              pose: detection.pose,
              parentDetectionIndex: i,
              segmentPartIndex: j
            },
            aiAnalysisResult: aiResultData
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
      const aiResult = await processImageAnalysis(croppedImage, analysisId, userId)
      
      // Parse the AI result from processImageAnalysis
      const aiResultData = JSON.parse(aiResult.ai_result_text)
      
      // Create analysis detail for this non-human detection
      const analysisDetail = {
        type: `${detection.type}_detection_${i + 1}`,
        description: `Analysis of detected ${detection.type} (confidence: ${(detection.confidence * 100).toFixed(1)}%) - ${aiResultData.authenticity_analysis?.overall_assessment || 'Analysis completed'}`,
        confidence: aiResult.ai_confidence,
        imageData: croppedImage,
        metadata: {
          segmentIndex: i,
          coordinates: {
            x: detection.box[0],
            y: detection.box[1], 
            width: detection.box[2] - detection.box[0],
            height: detection.box[3] - detection.box[1]
          },
          manipulationDetected: aiResultData.authenticity_analysis?.authentic_probability < 0.5,
          processingTime: 1000, // Default processing time
          hasError: aiResultData.error || false,
          yoloDetection: {
            confidence: detection.confidence,
            box: detection.box,
            classId: detection.classId,
            pose: detection.pose
          },
          aiAnalysisResult: aiResultData
        }
      }
      
      segmentResults.push(analysisDetail)
    }
  }
  
  return segmentResults
}

// Helper function to process segments (for fallback)
async function processSegments(segments: any[], analysisType: string, analysisId: string, userId: string) {
  const segmentResults = []
  
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
    
    // Call AI API for this specific segment
    const aiResult = await processImageAnalysis(segment.segment, analysisId, userId)
    
    // Parse the AI result from processImageAnalysis
    const aiResultData = JSON.parse(aiResult.ai_result_text)
    
    // Create analysis detail for this segment
    const analysisDetail = {
      type: `${analysisType}_${i + 1}`,
      description: `Analysis of image segment ${i + 1} (${segment.coordinates.x},${segment.coordinates.y}) - ${aiResultData.authenticity_analysis?.overall_assessment || 'Analysis completed'}`,
      confidence: aiResult.ai_confidence,
      imageData: segment.segment,
      metadata: {
        segmentIndex: i,
        coordinates: segment.coordinates,
        manipulationDetected: aiResultData.authenticity_analysis?.authentic_probability < 0.5,
        processingTime: 1000, // Default processing time
        hasError: aiResultData.error || false,
        aiAnalysisResult: aiResultData
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

          // Perform AI analysis and get detail records with streaming support
          let analysisDetails: any[] = []
          
          // Send YOLO analysis start message
          const yoloMessage = {
            type: 'yolo_analysis',
            message: 'Starting object detection and segmentation...'
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(yoloMessage)}\n\n`))

          try {
            // Call YOLO API for object detection
            const yoloResults = await callYOLOAPI(analysis.image_url)
            
            if (yoloResults.error) {
              console.error('YOLO API failed:', yoloResults.error)
              analysisDetails = []
            } else {
              // Process valid detections
              const validDetections = yoloResults.detections.filter((detection: any) => 
                detection.confidence >= 0.62 // Lower threshold for all objects
              )

              if (validDetections.length === 0) {
                console.log('No valid detections found')
                analysisDetails = []
              } else {
                // Send detection results
                const detectionMessage = {
                  type: 'detections_found',
                  message: `Found ${validDetections.length} objects to analyze`,
                  data: { 
                    detectionCount: validDetections.length,
                    detectionTypes: validDetections.map((d: any) => d.type)
                  }
                }
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(detectionMessage)}\n\n`))

                // Process each detection with streaming updates
                for (let i = 0; i < validDetections.length; i++) {
                  const detection = validDetections[i]
                  
                  const processingMessage = {
                    type: 'processing_detection',
                    message: `Processing ${detection.type} detection ${i + 1}/${validDetections.length}`,
                    data: { 
                      detectionType: detection.type,
                      confidence: detection.confidence,
                      progress: i + 1,
                      total: validDetections.length
                    }
                  }
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(processingMessage)}\n\n`))
                  
                  if (detection.type === 'person') {
                    // Human detected: segment the human area into parts
                    console.log(`Processing human detection ${i + 1}`)
                    
                    // Crop image to detection box
                    const croppedHumanImage = await cropImageByBox(analysis.image_url, detection.box)
                    
                    // Segment the cropped human image into parts
                    const humanSegments = await segmentHumanImage(croppedHumanImage, detection.box)
                    
                    // Process each human segment part with streaming
                    for (let j = 0; j < humanSegments.length; j++) {
                      const humanSegment = humanSegments[j]
                      
                      // Analyze each human segment part with streaming progress
                      const aiResult = await processImageAnalysisStreaming(
                        humanSegment.segment, 
                        analysisId, 
                        user.id,
                        (step: string, message: string, data?: any) => {
                          const streamMessage = {
                            type: 'ai_analysis_step',
                            step: step,
                            message: message,
                            data: data,
                            segmentInfo: {
                              detectionIndex: i,
                              segmentIndex: j,
                              detectionType: 'human',
                              totalDetections: validDetections.length,
                              totalSegments: humanSegments.length
                            }
                          }
                          controller.enqueue(encoder.encode(`data: ${JSON.stringify(streamMessage)}\n\n`))
                        }
                      )
                      
                      // Parse the AI result
                      const aiResultData = JSON.parse(aiResult.ai_result_text)
                      
                      // Create analysis detail for this human segment part
                      const analysisDetail = {
                        type: `human_segment_${i + 1}_part_${j + 1}`,
                        description: `Analysis of human ${i + 1} segment part ${j + 1} (confidence: ${(detection.confidence * 100).toFixed(1)}%) - ${aiResultData.authenticity_analysis?.overall_assessment || 'Analysis completed'}`,
                        confidence: aiResult.ai_confidence,
                        imageData: humanSegment.segment,
                        metadata: {
                          segmentIndex: `${i}_${j}`,
                          coordinates: humanSegment.coordinates,
                          manipulationDetected: aiResultData.authenticity_analysis?.authentic_probability < 0.5,
                          processingTime: 1000,
                          hasError: aiResultData.error || false,
                          yoloDetection: {
                            confidence: detection.confidence,
                            box: detection.box,
                            classId: detection.classId,
                            pose: detection.pose,
                            parentDetectionIndex: i,
                            segmentPartIndex: j
                          },
                          aiAnalysisResult: aiResultData
                        }
                      }
                      
                      analysisDetails.push(analysisDetail)
                    }
                  } else {
                    // Non-human detected: add directly without segmentation
                    console.log(`Processing non-human detection: ${detection.type}`)
                    
                    // Crop image to detection box
                    const croppedImage = await cropImageByBox(analysis.image_url, detection.box)
                    
                    // Analyze the non-human detection with streaming progress
                    const aiResult = await processImageAnalysisStreaming(
                      croppedImage, 
                      analysisId, 
                      user.id,
                      (step: string, message: string, data?: any) => {
                        const streamMessage = {
                          type: 'ai_analysis_step',
                          step: step,
                          message: message,
                          data: data,
                          segmentInfo: {
                            detectionIndex: i,
                            detectionType: detection.type,
                            totalDetections: validDetections.length
                          }
                        }
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify(streamMessage)}\n\n`))
                      }
                    )
                    
                    // Parse the AI result
                    const aiResultData = JSON.parse(aiResult.ai_result_text)
                    
                    // Create analysis detail for this non-human detection
                    const analysisDetail = {
                      type: `${detection.type}_detection_${i + 1}`,
                      description: `Analysis of detected ${detection.type} (confidence: ${(detection.confidence * 100).toFixed(1)}%) - ${aiResultData.authenticity_analysis?.overall_assessment || 'Analysis completed'}`,
                      confidence: aiResult.ai_confidence,
                      imageData: croppedImage,
                      metadata: {
                        segmentIndex: i,
                        coordinates: {
                          x: detection.box[0],
                          y: detection.box[1], 
                          width: detection.box[2] - detection.box[0],
                          height: detection.box[3] - detection.box[1]
                        },
                        manipulationDetected: aiResultData.authenticity_analysis?.authentic_probability < 0.5,
                        processingTime: 1000,
                        hasError: aiResultData.error || false,
                        yoloDetection: {
                          confidence: detection.confidence,
                          box: detection.box,
                          classId: detection.classId,
                          pose: detection.pose
                        },
                        aiAnalysisResult: aiResultData
                      }
                    }
                    
                    analysisDetails.push(analysisDetail)
                  }
                }
              }
            }
          } catch (yoloError) {
            console.error('Error in YOLO analysis:', yoloError)
            const errorMessage = {
              type: 'yolo_error',
              message: 'Object detection failed, using fallback analysis',
              error: yoloError instanceof Error ? yoloError.message : 'Unknown error'
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorMessage)}\n\n`))
            
            // Fallback: analyze the whole image
            const fallbackMessage = {
              type: 'fallback_analysis',
              message: 'Performing full image analysis as fallback...'
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(fallbackMessage)}\n\n`))
            
            const aiResult = await processImageAnalysisStreaming(
              analysis.image_url, 
              analysisId, 
              user.id,
              (step: string, message: string, data?: any) => {
                const streamMessage = {
                  type: 'ai_analysis_step',
                  step: step,
                  message: message,
                  data: data,
                  segmentInfo: {
                    fallbackMode: true
                  }
                }
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(streamMessage)}\n\n`))
              }
            )
            
            const aiResultData = JSON.parse(aiResult.ai_result_text)
            
            analysisDetails = [{
              type: 'full_image_analysis',
              description: `Full image analysis (fallback mode) - ${aiResultData.authenticity_analysis?.overall_assessment || 'Analysis completed'}`,
              confidence: aiResult.ai_confidence,
              imageData: analysis.image_url,
              metadata: {
                segmentIndex: 0,
                coordinates: { x: 0, y: 0, width: 100, height: 100 },
                manipulationDetected: aiResultData.authenticity_analysis?.authentic_probability < 0.5,
                processingTime: 1000,
                hasError: aiResultData.error || false,
                fallbackMode: true,
                aiAnalysisResult: aiResultData
              }
            }]
          }

          // Process each analysis detail for database storage
          for (let i = 0; i < analysisDetails.length; i++) {
            const detail = analysisDetails[i] // This is now a segment result
            
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
