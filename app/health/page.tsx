'use client'

import { useHealthCheck } from '@/contexts/HealthCheckContext'
import { useState } from 'react'

export default function HealthPage() {
  const { healthStatus, isCheckingHealth, lastCheckTime, recheckHealth } = useHealthCheck()
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null)

  const handleAutoRefreshToggle = () => {
    if (autoRefresh) {
      // Stop auto refresh
      if (refreshInterval) {
        clearInterval(refreshInterval)
        setRefreshInterval(null)
      }
      setAutoRefresh(false)
    } else {
      // Start auto refresh every 30 seconds
      const interval = setInterval(() => {
        recheckHealth()
      }, 30000)
      setRefreshInterval(interval)
      setAutoRefresh(true)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'unhealthy':
        return 'text-red-600 bg-red-50 border-red-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return '✅'
      case 'unhealthy':
        return '❌'
      default:
        return '❓'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Navigation */}
        <nav className="mb-4">
          <a
            href="/"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </a>
        </nav>

        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">API Health Dashboard</h1>
              <p className="mt-2 text-gray-600">
                Monitor the status of all external API services
              </p>
            </div>
            <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row gap-3">
              <button
                onClick={recheckHealth}
                disabled={isCheckingHealth}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCheckingHealth ? (
                  <>
                    <div className="animate-spin -ml-1 mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    Checking...
                  </>
                ) : (
                  <>
                    <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh Now
                  </>
                )}
              </button>
              <button
                onClick={handleAutoRefreshToggle}
                className={`inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  autoRefresh
                    ? 'border-green-600 text-green-600 bg-green-50 hover:bg-green-100 focus:ring-green-500'
                    : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-blue-500'
                }`}
              >
                <div className={`w-2 h-2 rounded-full mr-2 ${autoRefresh ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                {autoRefresh ? 'Auto Refresh ON' : 'Auto Refresh OFF'}
              </button>
            </div>
          </div>
        </div>

        {/* Overall Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className={`text-2xl mr-3`}>
                {healthStatus?.allHealthy ? '🟢' : '🔴'}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Overall Status</p>
                <p className={`text-lg font-semibold ${
                  healthStatus?.allHealthy ? 'text-green-600' : 'text-red-600'
                }`}>
                  {isCheckingHealth ? 'Checking...' : healthStatus?.allHealthy ? 'All Healthy' : 'Issues Detected'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="text-2xl mr-3">📊</div>
              <div>
                <p className="text-sm font-medium text-gray-600">Services Monitored</p>
                <p className="text-lg font-semibold text-gray-900">
                  {healthStatus?.results.length || 0} Services
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="text-2xl mr-3">🕒</div>
              <div>
                <p className="text-sm font-medium text-gray-600">Last Check</p>
                <p className="text-lg font-semibold text-gray-900">
                  {lastCheckTime ? new Date(lastCheckTime).toLocaleTimeString() : 'Never'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Service Details */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Service Details</h2>
          </div>
          
          {isCheckingHealth ? (
            <div className="p-8 text-center">
              <div className="animate-spin mx-auto h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mb-4"></div>
              <p className="text-gray-600">Checking service health...</p>
            </div>
          ) : healthStatus?.results.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-4xl mb-4">⚠️</div>
              <p className="text-gray-600 mb-2">No API services configured</p>
              <p className="text-sm text-gray-500 mb-4">
                Make sure environment variables are set for YOLO_API_URL, SEGFORMER_API_URL, and LLM_API_URL in your .env.local file
              </p>
              <button
                onClick={recheckHealth}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Check Environment Config
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {healthStatus?.results.map((result, index) => (
                <div key={index} className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="text-2xl">{getStatusIcon(result.status)}</div>
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">{result.service}</h3>
                        <p className="text-sm text-gray-500">{result.url}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(result.status)}`}>
                        {result.status.toUpperCase()}
                      </div>
                      {result.responseTime && (
                        <p className="text-sm text-gray-500 mt-1">
                          {result.responseTime}ms response time
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {result.message && (
                    <div className="mt-3 ml-10">
                      <div className={`p-3 rounded-md text-sm ${
                        result.status === 'healthy'
                          ? 'bg-green-50 text-green-800 border border-green-200'
                          : 'bg-red-50 text-red-800 border border-red-200'
                      }`}>
                        <strong>Details:</strong> {result.message}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Additional Info */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-800">
                <strong>Info:</strong> This dashboard monitors the health of external API services by checking their <code>/health</code> endpoints. 
                Auto-refresh can be enabled to continuously monitor service status every 30 seconds.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
