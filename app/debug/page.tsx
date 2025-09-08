'use client'

import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'

export default function DebugPage() {
  const { user, profile, isLoading, isAdmin } = useAuth()

  const debugPages = [
    {
      title: 'Analysis API',
      description: 'Test analysis retrieval and deletion endpoints',
      path: '/debug/analysis',
      icon: '📊',
      category: 'API Testing'
    },
    {
      title: 'Analysis Analyze API',
      description: 'Test real-time AI analysis with streaming progress',
      path: '/debug/analysis-analyze',
      icon: '🤖',
      category: 'AI Analysis'
    },
    {
      title: 'Upload API',
      description: 'Test image upload functionality',
      path: '/debug/upload',
      icon: '📤',
      category: 'API Testing'
    },
    {
      title: 'Auth State',
      description: 'View current authentication state and user profile',
      path: '/debug/auth-state',
      icon: '🔐',
      category: 'Authentication'
    }
  ]

  const categories = Array.from(new Set(debugPages.map(page => page.category)))

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Debug Tools</h1>
      
      {/* User Status */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Current User Status</h2>
        
        {isLoading ? (
          <div className="text-gray-600">Loading authentication status...</div>
        ) : user ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4">
              <h3 className="font-medium mb-2 text-gray-800">User ID</h3>
              <code className="text-sm bg-gray-100 px-2 py-1 rounded">{user.id}</code>
            </div>
            <div className="bg-white rounded-lg p-4">
              <h3 className="font-medium mb-2 text-gray-800">Email</h3>
              <div className="text-sm">{user.email || 'N/A'}</div>
            </div>
            <div className="bg-white rounded-lg p-4">
              <h3 className="font-medium mb-2 text-gray-800">Role</h3>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                isAdmin ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {profile?.role || 'Unknown'}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <div className="text-red-600 font-medium mb-2">Not Authenticated</div>
            <div className="text-sm text-gray-600">
              You need to log in to access most debug tools.
            </div>
            <Link 
              href="/admin/login" 
              className="inline-block mt-3 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Go to Login
            </Link>
          </div>
        )}
      </div>

      {/* Debug Tools by Category */}
      {categories.map(category => (
        <div key={category} className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">{category}</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {debugPages
              .filter(page => page.category === category)
              .map(page => (
                <Link 
                  key={page.path}
                  href={page.path}
                  className="block bg-white border border-gray-200 rounded-lg p-6 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start">
                    <div className="text-2xl mr-4">{page.icon}</div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-2 text-gray-900">
                        {page.title}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {page.description}
                      </p>
                    </div>
                    <div className="text-gray-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </Link>
              ))}
          </div>
        </div>
      ))}

      {/* Quick Links */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link 
            href="/admin/dashboard" 
            className="text-sm bg-white border border-gray-200 rounded px-3 py-2 hover:bg-gray-50 text-center"
          >
            Admin Dashboard
          </Link>
          <Link 
            href="/dashboard" 
            className="text-sm bg-white border border-gray-200 rounded px-3 py-2 hover:bg-gray-50 text-center"
          >
            User Dashboard
          </Link>
          <Link 
            href="/health" 
            className="text-sm bg-white border border-gray-200 rounded px-3 py-2 hover:bg-gray-50 text-center"
          >
            Health Check
          </Link>
          <Link 
            href="/test-trpc" 
            className="text-sm bg-white border border-gray-200 rounded px-3 py-2 hover:bg-gray-50 text-center"
          >
            tRPC Test
          </Link>
        </div>
      </div>

      {/* Usage Notes */}
      <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2">About Debug Tools</h3>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>• <strong>Development Only:</strong> These tools are for development and testing purposes</li>
          <li>• <strong>Authentication:</strong> Most tools require valid user authentication</li>
          <li>• <strong>API Testing:</strong> Direct API endpoint testing with real-time feedback</li>
          <li>• <strong>Streaming Support:</strong> Real-time progress monitoring for long-running operations</li>
          <li>• <strong>Token Management:</strong> Automatic token saving and loading for convenience</li>
        </ul>
      </div>
    </div>
  )
}
