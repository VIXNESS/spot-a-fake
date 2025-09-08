'use client'

import { useState, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'

interface UploadResponse {
  success: boolean
  data?: {
    analysis: {
      id: number
      user_id: string
      image_url: string
      visibility: string
      created_at: string
      updated_at: string
    }
  }
  error?: string
}

export default function DebugUploadPage() {
  const { user, token } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [visibility, setVisibility] = useState<'private' | 'public'>('private')
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<UploadResponse | null>(null)
  const [requestDetails, setRequestDetails] = useState<any>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setResponse(null)
      setRequestDetails(null)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      alert('Please select a file first')
      return
    }

    if (!token) {
      alert('No authentication token available. Please login first.')
      return
    }

    setLoading(true)
    setResponse(null)
    setRequestDetails(null)

    try {
      const formData = new FormData()
      formData.append('image', selectedFile)
      formData.append('visibility', visibility)

      // Store request details for debugging
      const requestInfo = {
        url: '/api/analysis/upload',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: {
          image: `File: ${selectedFile.name} (${selectedFile.size} bytes, ${selectedFile.type})`,
          visibility: visibility
        }
      }
      setRequestDetails(requestInfo)

      const response = await fetch('/api/analysis/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      const result = await response.json()
      setResponse(result)

    } catch (error) {
      console.error('Upload error:', error)
      setResponse({
        success: false,
        error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    } finally {
      setLoading(false)
    }
  }

  const clearAll = () => {
    setSelectedFile(null)
    setResponse(null)
    setRequestDetails(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Debug: File Upload API
          </h1>

          {/* Authentication Status */}
          <div className="mb-6 p-4 rounded-lg bg-blue-50 border border-blue-200">
            <h2 className="text-lg font-semibold text-blue-900 mb-2">Authentication Status</h2>
            <div className="space-y-1 text-sm">
              <p><strong>User ID:</strong> {user?.id || 'Not logged in'}</p>
              <p><strong>Email:</strong> {user?.email || 'N/A'}</p>
              <p><strong>Token Available:</strong> {token ? '✅ Yes' : '❌ No'}</p>
              {token && (
                <p><strong>Token Preview:</strong> {token.substring(0, 20)}...</p>
              )}
            </div>
          </div>

          {/* File Upload Form */}
          <div className="mb-6 p-4 rounded-lg bg-gray-50 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Configuration</h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="file-input" className="block text-sm font-medium text-gray-700 mb-2">
                  Select Image File
                </label>
                <input
                  ref={fileInputRef}
                  id="file-input"
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {selectedFile && (
                  <div className="mt-2 text-sm text-gray-600">
                    <p><strong>File:</strong> {selectedFile.name}</p>
                    <p><strong>Size:</strong> {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    <p><strong>Type:</strong> {selectedFile.type}</p>
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="visibility" className="block text-sm font-medium text-gray-700 mb-2">
                  Visibility
                </label>
                <select
                  id="visibility"
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value as 'private' | 'public')}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="private">Private</option>
                  <option value="public">Public</option>
                </select>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleUpload}
                  disabled={!selectedFile || loading || !token}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? 'Uploading...' : 'Upload File'}
                </button>
                <button
                  onClick={clearAll}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  Clear All
                </button>
              </div>
            </div>
          </div>

          {/* Request Details */}
          {requestDetails && (
            <div className="mb-6 p-4 rounded-lg bg-yellow-50 border border-yellow-200">
              <h2 className="text-lg font-semibold text-yellow-900 mb-2">Request Details</h2>
              <pre className="text-sm bg-yellow-100 p-3 rounded overflow-x-auto">
                {JSON.stringify(requestDetails, null, 2)}
              </pre>
            </div>
          )}

          {/* Response Display */}
          {response && (
            <div className={`p-4 rounded-lg border ${
              response.success 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <h2 className={`text-lg font-semibold mb-2 ${
                response.success ? 'text-green-900' : 'text-red-900'
              }`}>
                API Response {response.success ? '✅' : '❌'}
              </h2>
              
              {response.success && response.data ? (
                <div className="space-y-3">
                  <div className="text-sm">
                    <p><strong>Analysis ID:</strong> {response.data.analysis.id}</p>
                    <p><strong>User ID:</strong> {response.data.analysis.user_id}</p>
                    <p><strong>Visibility:</strong> {response.data.analysis.visibility}</p>
                    <p><strong>Created At:</strong> {new Date(response.data.analysis.created_at).toLocaleString()}</p>
                    <p><strong>Image URL:</strong></p>
                    <a 
                      href={response.data.analysis.image_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline break-all"
                    >
                      {response.data.analysis.image_url}
                    </a>
                  </div>
                  
                  {/* Preview uploaded image */}
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Image Preview:</p>
                    <img 
                      src={response.data.analysis.image_url} 
                      alt="Uploaded image" 
                      className="max-w-md max-h-64 object-contain border border-gray-300 rounded"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="text-sm text-red-700">
                  <p><strong>Error:</strong> {response.error}</p>
                </div>
              )}

              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium">
                  Raw Response JSON
                </summary>
                <pre className="mt-2 text-xs bg-gray-100 p-3 rounded overflow-x-auto">
                  {JSON.stringify(response, null, 2)}
                </pre>
              </details>
            </div>
          )}

          {/* API Documentation */}
          <div className="mt-8 p-4 rounded-lg bg-gray-50 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">API Documentation</h2>
            <div className="text-sm text-gray-700 space-y-2">
              <p><strong>Endpoint:</strong> POST /api/analysis/upload</p>
              <p><strong>Content-Type:</strong> multipart/form-data</p>
              <p><strong>Authorization:</strong> Bearer token required</p>
              <p><strong>Form Fields:</strong></p>
              <ul className="ml-4 list-disc">
                <li><code>image</code> (File): Image file to upload</li>
                <li><code>visibility</code> (string): "private" or "public"</li>
              </ul>
              <p><strong>File Restrictions:</strong></p>
              <ul className="ml-4 list-disc">
                <li>Must be an image file (image/*)</li>
                <li>Maximum size: 10MB</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
