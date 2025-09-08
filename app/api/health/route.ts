import { NextResponse } from 'next/server'
import { checkAllServices } from '@/lib/utils/health-check'

export async function GET() {
  try {
    // Log environment variables for debugging (remove in production)
    console.log('Environment check:', {
      YOLO_API_URL: process.env.YOLO_API_URL ? 'set' : 'not set',
      SEGFORMER_API_URL: process.env.SEGFORMER_API_URL ? 'set' : 'not set',
      LLM_API_URL: process.env.LLM_API_URL ? 'set' : 'not set',
    })

    const healthSummary = await checkAllServices()
    
    return NextResponse.json({
      status: healthSummary.allHealthy ? 'healthy' : 'unhealthy',
      timestamp: healthSummary.timestamp,
      services: healthSummary.results,
      summary: {
        total: healthSummary.results.length,
        healthy: healthSummary.results.filter(r => r.status === 'healthy').length,
        unhealthy: healthSummary.results.filter(r => r.status === 'unhealthy').length,
        unknown: healthSummary.results.filter(r => r.status === 'unknown').length,
      },
      environment: {
        YOLO_API_URL: process.env.YOLO_API_URL || 'not configured',
        SEGFORMER_API_URL: process.env.SEGFORMER_API_URL || 'not configured',
        LLM_API_URL: process.env.LLM_API_URL || 'not configured',
      }
    }, {
      status: healthSummary.allHealthy ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json'
      }
    })
  } catch (error) {
    console.error('Health check endpoint error:', error)
    
    return NextResponse.json({
      status: 'error',
      message: 'Failed to perform health checks',
      timestamp: Date.now(),
      error: error instanceof Error ? error.message : 'Unknown error',
      environment: {
        YOLO_API_URL: process.env.YOLO_API_URL || 'not configured',
        SEGFORMER_API_URL: process.env.SEGFORMER_API_URL || 'not configured',
        LLM_API_URL: process.env.LLM_API_URL || 'not configured',
      }
    }, {
      status: 500,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json'
      }
    })
  }
}
