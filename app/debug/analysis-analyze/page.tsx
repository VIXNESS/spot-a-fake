'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'

interface StreamMessage {
  type: string
  message: string
  step?: number
  total?: number
  data?: any
  error?: string
  analysisId?: string
  segmentInfo?: any
  detail?: any
  summary?: any
}

export default function AnalysisAnalyzeDebugPage() {
  const { user, profile, token, isLoading, isAdmin } = useAuth()
  const [analysisId, setAnalysisId] = useState('')
  const [authToken, setAuthToken] = useState('')
  const [streamMessages, setStreamMessages] = useState<StreamMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected')
  const eventSourceRef = useRef<EventSource | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load saved token from localStorage on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedToken = localStorage.getItem('debug-auth-token')
      if (savedToken) {
        setAuthToken(savedToken)
      }
    }
  }, [])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [streamMessages])

  const saveToken = (token: string) => {
    setAuthToken(token)
    if (typeof window !== 'undefined') {
      localStorage.setItem('debug-auth-token', token)
    }
  }

  const useCurrentUserToken = () => {
    if (token) {
      saveToken(token)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const clearMessages = () => {
    setStreamMessages([])
    setError(null)
  }

  const stopStream = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    setIsStreaming(false)
    setConnectionStatus('disconnected')
  }

  const startAnalysis = async () => {
    if (!analysisId.trim()) {
      setError('Analysis ID is required')
      return
    }

    if (!authToken.trim()) {
      setError('Authorization token is required')
      return
    }

    setError(null)
    setStreamMessages([])
    setIsStreaming(true)
    setConnectionStatus('connecting')

    try {
      // Create URL with proper authentication
      const url = `/api/analysis/${analysisId}/analyze`
      
      // Use fetch with streaming response
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`HTTP ${response.status}: ${errorData.error || response.statusText}`)
      }

      setConnectionStatus('connected')

      // Handle streaming response
      if (response.body) {
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        try {
          while (true) {
            const { done, value } = await reader.read()
            
            if (done) {
              setConnectionStatus('disconnected')
              setIsStreaming(false)
              break
            }

            // Decode chunk and add to buffer
            buffer += decoder.decode(value, { stream: true })
            
            // Process complete lines
            const lines = buffer.split('\n')
            buffer = lines.pop() || '' // Keep incomplete line in buffer

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6) // Remove 'data: ' prefix
                
                if (data.trim() === '[DONE]') {
                  continue
                }
                
                try {
                  const parsed: StreamMessage = JSON.parse(data)
                  setStreamMessages(prev => [...prev, {
                    ...parsed,
                    timestamp: Date.now()
                  }])
                } catch (parseError) {
                  console.warn('Failed to parse streaming message:', parseError, data)
                  // Add as raw message
                  setStreamMessages(prev => [...prev, {
                    type: 'raw',
                    message: data,
                    timestamp: Date.now()
                  }])
                }
              }
            }
          }
        } finally {
          reader.releaseLock()
        }
      }

    } catch (error) {
      console.error('Analysis streaming error:', error)
      setError(error instanceof Error ? error.message : 'Unknown error occurred')
      setConnectionStatus('error')
      setIsStreaming(false)
    }
  }

  const getMessageTypeColor = (type: string) => {
    switch (type) {
      case 'start': return 'bg-blue-100 text-blue-800'
      case 'yolo_analysis': return 'bg-purple-100 text-purple-800'
      case 'detections_found': return 'bg-green-100 text-green-800'
      case 'processing_detection': return 'bg-yellow-100 text-yellow-800'
      case 'ai_analysis_step': return 'bg-indigo-100 text-indigo-800'
      case 'progress': return 'bg-teal-100 text-teal-800'
      case 'summary_progress': return 'bg-orange-100 text-orange-800'
      case 'summary_complete': return 'bg-green-100 text-green-800'
      case 'complete': return 'bg-green-100 text-green-800'
      case 'error': return 'bg-red-100 text-red-800'
      case 'yolo_error': return 'bg-red-100 text-red-800'
      case 'fallback_analysis': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'bg-green-100 text-green-800'
      case 'connecting': return 'bg-yellow-100 text-yellow-800'
      case 'error': return 'bg-red-100 text-red-800'
      case 'disconnected': return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">Analysis Analyze API Debug Tool</h1>
      
      {/* Connection Status */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Connection Status:</span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getConnectionStatusColor()}`}>
            {connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)}
          </span>
          {isStreaming && (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-sm text-blue-600">Streaming...</span>
            </div>
          )}
        </div>
      </div>

      {/* User Authentication Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Current User Authentication</h2>
        
        {isLoading ? (
          <div className="text-gray-600">Loading authentication status...</div>
        ) : user ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* User Info */}
              <div className="bg-white rounded-lg p-4">
                <h3 className="font-medium mb-3 text-gray-800">User Information</h3>
                <div className="space-y-2 text-sm">
                  <div><strong>User ID:</strong> <code className="bg-gray-100 px-1 rounded">{user.id}</code></div>
                  <div><strong>Email:</strong> {user.email || 'N/A'}</div>
                  <div><strong>Role:</strong> 
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                      isAdmin ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {profile?.role || 'Unknown'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bearer Token */}
              <div className="bg-white rounded-lg p-4">
                <h3 className="font-medium mb-3 text-gray-800">Bearer Token</h3>
                {token ? (
                  <div className="space-y-2">
                    <div className="text-sm">
                      <div className="bg-gray-100 p-2 rounded text-xs font-mono break-all">
                        {token.substring(0, 50)}...
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => copyToClipboard(token)}
                        className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded"
                      >
                        Copy Full Token
                      </button>
                      <button
                        onClick={useCurrentUserToken}
                        className="text-xs bg-green-100 hover:bg-green-200 text-green-700 px-2 py-1 rounded"
                      >
                        Use This Token
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-red-600 text-sm">No token available</div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <div className="text-red-600 font-medium mb-2">Not Authenticated</div>
            <div className="text-sm text-gray-600">You need to log in to access authentication information.</div>
          </div>
        )}
      </div>

      {/* API Endpoint Info */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
        <h2 className="text-lg font-semibold mb-2">API Endpoint</h2>
        <code className="text-sm bg-gray-100 px-2 py-1 rounded">
          POST /api/analysis/[analysisId]/analyze
        </code>
        <p className="text-sm text-gray-600 mt-2">
          Starts AI analysis on an uploaded image with real-time streaming progress updates.
          This includes YOLO object detection, image segmentation, luxury brand analysis, 
          fake goods detection, and translation services.
        </p>
      </div>

      {/* Configuration Form */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Test Configuration</h2>
        
        <div className="space-y-4">
          {/* Analysis ID */}
          <div>
            <label htmlFor="analysisId" className="block text-sm font-medium mb-2">
              Analysis ID *
            </label>
            <input
              id="analysisId"
              type="text"
              value={analysisId}
              onChange={(e) => setAnalysisId(e.target.value)}
              placeholder="Enter analysis ID (UUID)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isStreaming}
            />
            <p className="text-xs text-gray-500 mt-1">
              Must be a valid analysis ID that exists in the database and belongs to your user (or you must be admin).
            </p>
          </div>

          {/* Auth Token */}
          <div>
            <label htmlFor="authToken" className="block text-sm font-medium mb-2">
              Authorization Token *
            </label>
            <input
              id="authToken"
              type="password"
              value={authToken}
              onChange={(e) => saveToken(e.target.value)}
              placeholder="Enter Bearer token (automatically saved)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isStreaming}
            />
            <p className="text-xs text-gray-500 mt-1">
              Token is automatically saved to localStorage for convenience.
            </p>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="text-red-800 text-sm">{error}</div>
          </div>
        )}

        {/* Control Buttons */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={startAnalysis}
            disabled={isStreaming || !analysisId.trim() || !authToken.trim()}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isStreaming ? 'Analysis Running...' : 'Start AI Analysis'}
          </button>
          
          {isStreaming && (
            <button
              onClick={stopStream}
              className="bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700"
            >
              Stop Stream
            </button>
          )}
          
          <button
            onClick={clearMessages}
            className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700"
          >
            Clear Messages
          </button>
        </div>
      </div>

      {/* Streaming Messages Display */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Real-time Analysis Stream</h2>
          <div className="text-sm text-gray-500">
            {streamMessages.length} messages
          </div>
        </div>

        <div className="h-96 overflow-y-auto border border-gray-200 rounded-md p-4 bg-gray-50">
          {streamMessages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No messages yet. Start an analysis to see real-time progress.
            </div>
          ) : (
            <div className="space-y-3">
              {streamMessages.map((message, index) => (
                <div key={index} className="bg-white rounded-lg p-3 shadow-sm">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getMessageTypeColor(message.type)}`}>
                        {message.type}
                      </span>
                      {message.step && message.total && (
                        <span className="text-xs text-gray-500">
                          {message.step}/{message.total}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(message.timestamp || Date.now()).toLocaleTimeString()}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-800 mb-2">
                    {message.message}
                  </div>

                  {/* Additional Data Display */}
                  {message.data && (
                    <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
                      <strong>Data:</strong>
                      <pre className="mt-1 whitespace-pre-wrap">
                        {JSON.stringify(message.data, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* Segment Info Display */}
                  {message.segmentInfo && (
                    <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
                      <strong>Segment Info:</strong>
                      <pre className="mt-1 whitespace-pre-wrap">
                        {JSON.stringify(message.segmentInfo, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* Detail Display */}
                  {message.detail && (
                    <div className="mt-2 p-2 bg-green-50 rounded text-xs">
                      <strong>Analysis Detail:</strong>
                      <div className="mt-1">
                        <div><strong>Type:</strong> {message.detail.type}</div>
                        <div><strong>Confidence:</strong> {(message.detail.confidence * 100).toFixed(2)}%</div>
                        <div><strong>Manipulation Detected:</strong> {message.detail.manipulationDetected ? 'Yes' : 'No'}</div>
                      </div>
                    </div>
                  )}

                  {/* Summary Display */}
                  {message.summary && (
                    <div className="mt-2 p-2 bg-yellow-50 rounded text-xs">
                      <strong>Summary:</strong>
                      <div className="mt-1">
                        <div><strong>Overall Result:</strong> {message.summary.overallResult}</div>
                        <div><strong>Confidence:</strong> {(message.summary.confidence * 100).toFixed(2)}%</div>
                      </div>
                    </div>
                  )}

                  {/* Error Display */}
                  {message.error && (
                    <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-800">
                      <strong>Error:</strong> {message.error}
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Usage Notes */}
      <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2">Usage Notes</h3>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>• <strong>Analysis Pipeline:</strong> YOLO object detection → Image segmentation → Luxury brand analysis → Fake goods detection → Translation</li>
          <li>• <strong>Streaming:</strong> Real-time progress updates with detailed step-by-step information</li>
          <li>• <strong>Authorization:</strong> Requires valid Bearer token and analysis ownership or admin privileges</li>
          <li>• <strong>Preprocessing:</strong> Analysis record must exist and have pending/processing status</li>
          <li>• <strong>Results:</strong> Creates multiple analysis_detail records and updates main analysis record</li>
          <li>• <strong>Error Handling:</strong> Fallback mechanisms for API failures with detailed error reporting</li>
          <li>• <strong>Storage:</strong> Segment images uploaded to Supabase storage with public URLs</li>
        </ul>
      </div>
    </div>
  )
}
