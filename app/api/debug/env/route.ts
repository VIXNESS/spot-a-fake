import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    environment: {
      YOLO_API_URL: process.env.YOLO_API_URL || 'not set',
      SEGFORMER_API_URL: process.env.SEGFORMER_API_URL || 'not set', 
      LLM_API_URL: process.env.LLM_API_URL || 'not set',
      NODE_ENV: process.env.NODE_ENV || 'not set',
    },
    message: 'This endpoint shows which environment variables are available to the server'
  })
}
