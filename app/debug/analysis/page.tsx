'use client'

import { useState } from 'react'

interface ApiResponse {
  success: boolean
  data?: any
  error?: string
  message?: string
  _metadata?: {
    status: number
    statusText: string
    headers: Record<string, string>
  }
}

export default function AnalysisDebugPage() {
  const [analysisId, setAnalysisId] = useState('')
  const [authToken, setAuthToken] = useState('')
  const [response, setResponse] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [operation, setOperation] = useState<'GET' | 'DELETE'>('GET')

  // Load saved token from localStorage on component mount
  useState(() => {
    if (typeof window !== 'undefined') {
      const savedToken = localStorage.getItem('debug-auth-token')
      if (savedToken) {
        setAuthToken(savedToken)
      }
    }
  })

  const saveToken = (token: string) => {
    setAuthToken(token)
    if (typeof window !== 'undefined') {
      localStorage.setItem('debug-auth-token', token)
    }
  }

  const testAnalysisApi = async () => {
    if (!analysisId.trim()) {
      setResponse({
        success: false,
        error: 'Analysis ID is required'
      })
      return
    }

    setLoading(true)
    setResponse(null)

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      }

      if (authToken.trim()) {
        headers['Authorization'] = `Bearer ${authToken}`
      }

      const url = `/api/analysis/${analysisId}`
      
      const response = await fetch(url, {
        method: operation,
        headers
      })

      const data = await response.json()
      
      setResponse({
        success: response.ok,
        ...data,
        // Add response metadata
        _metadata: {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries())
        }
      })
    } catch (error) {
      setResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    } finally {
      setLoading(false)
    }
  }

  const copyResponseToClipboard = () => {
    if (response) {
      navigator.clipboard.writeText(JSON.stringify(response, null, 2))
    }
  }

  const clearResponse = () => {
    setResponse(null)
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Analysis API Debug Tool</h1>
      
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
        <h2 className="text-lg font-semibold mb-2">API Endpoint</h2>
        <code className="text-sm bg-gray-100 px-2 py-1 rounded">
          /api/analysis/[analysisId]
        </code>
        <p className="text-sm text-gray-600 mt-2">
          Tests the GET and DELETE operations for analysis data retrieval and deletion.
        </p>
      </div>

      {/* Configuration Form */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Test Configuration</h2>
        
        <div className="space-y-4">
          {/* Operation Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Operation</label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="GET"
                  checked={operation === 'GET'}
                  onChange={(e) => setOperation(e.target.value as 'GET')}
                  className="mr-2"
                />
                GET (Retrieve Analysis)
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="DELETE"
                  checked={operation === 'DELETE'}
                  onChange={(e) => setOperation(e.target.value as 'DELETE')}
                  className="mr-2"
                />
                DELETE (Delete Analysis)
              </label>
            </div>
          </div>

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
            />
          </div>

          {/* Auth Token */}
          <div>
            <label htmlFor="authToken" className="block text-sm font-medium mb-2">
              Authorization Token
            </label>
            <input
              id="authToken"
              type="password"
              value={authToken}
              onChange={(e) => saveToken(e.target.value)}
              placeholder="Enter Bearer token (automatically saved)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Token is automatically saved to localStorage for convenience
            </p>
          </div>
        </div>

        {/* Test Button */}
        <button
          onClick={testAnalysisApi}
          disabled={loading || !analysisId.trim()}
          className="mt-6 bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? 'Testing...' : `Test ${operation} Request`}
        </button>
      </div>

      {/* Response Display */}
      {response && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">API Response</h2>
            <div className="space-x-2">
              <button
                onClick={copyResponseToClipboard}
                className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-md"
              >
                Copy JSON
              </button>
              <button
                onClick={clearResponse}
                className="text-sm bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded-md"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Status Badge */}
          <div className="mb-4">
            <span
              className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                response.success
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {response.success ? 'Success' : 'Error'}
              {response._metadata && ` (${response._metadata.status})`}
            </span>
          </div>

          {/* Response Content */}
          <div className="bg-gray-50 rounded-md p-4 overflow-auto">
            <pre className="text-sm whitespace-pre-wrap">
              {JSON.stringify(response, null, 2)}
            </pre>
          </div>

          {/* Analysis Data Display */}
          {response.success && response.data && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3">Analysis Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {response.data.analysis && (
                  <div className="bg-blue-50 p-4 rounded-md">
                    <h4 className="font-medium mb-2">Analysis Info</h4>
                    <ul className="text-sm space-y-1">
                      <li><strong>ID:</strong> {response.data.analysis.id}</li>
                      <li><strong>Status:</strong> {response.data.analysis.status}</li>
                      <li><strong>Visibility:</strong> {response.data.analysis.visibility}</li>
                      <li><strong>Created:</strong> {new Date(response.data.analysis.created_at).toLocaleString()}</li>
                      {response.data.analysis.image_url && (
                        <li><strong>Image:</strong> <a href={response.data.analysis.image_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View</a></li>
                      )}
                    </ul>
                  </div>
                )}
                
                {response.data.details && (
                  <div className="bg-green-50 p-4 rounded-md">
                    <h4 className="font-medium mb-2">Analysis Details</h4>
                    <p className="text-sm">
                      <strong>Count:</strong> {response.data.details.length} detail records
                    </p>
                    {response.data.details.length > 0 && (
                      <p className="text-sm mt-1">
                        <strong>Latest:</strong> {new Date(response.data.details[response.data.details.length - 1].created_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Usage Notes */}
      <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2">Usage Notes</h3>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>• <strong>GET:</strong> Retrieves analysis data and details for the specified ID</li>
          <li>• <strong>DELETE:</strong> Deletes the analysis and associated image from storage</li>
          <li>• Authorization token is required for both operations</li>
          <li>• Users can only access their own analyses unless they&apos;re admin or analysis is public</li>
          <li>• Only owners and admins can delete analyses</li>
          <li>• Token is automatically saved to localStorage for convenience</li>
        </ul>
      </div>
    </div>
  )
}
