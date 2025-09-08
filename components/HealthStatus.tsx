'use client'

import { useHealthCheck } from '@/contexts/HealthCheckContext'

interface HealthStatusProps {
  showDetails?: boolean
  className?: string
}

export function HealthStatus({ showDetails = false, className = '' }: HealthStatusProps) {
  const { healthStatus, isCheckingHealth, lastCheckTime, recheckHealth } = useHealthCheck()

  if (isCheckingHealth) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
        <span className="text-sm text-gray-600">Checking API health...</span>
      </div>
    )
  }

  if (!healthStatus) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
        <span className="text-sm text-gray-600">Health status unknown</span>
      </div>
    )
  }

  const statusColor = healthStatus.allHealthy ? 'bg-green-500' : 'bg-red-500'
  const statusText = healthStatus.allHealthy ? 'All APIs healthy' : 'Some APIs unhealthy'

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center space-x-2">
        <div className={`w-2 h-2 ${statusColor} rounded-full`}></div>
        <span className="text-sm text-gray-700">{statusText}</span>
        <button
          onClick={recheckHealth}
          className="text-xs text-blue-600 hover:text-blue-800 underline"
          disabled={isCheckingHealth}
        >
          Recheck
        </button>
      </div>

      {showDetails && healthStatus.results.length > 0 && (
        <div className="ml-4 space-y-1">
          {healthStatus.results.map((result, index) => (
            <div key={index} className="flex items-center space-x-2 text-xs">
              <div 
                className={`w-1.5 h-1.5 rounded-full ${
                  result.status === 'healthy' ? 'bg-green-400' : 'bg-red-400'
                }`}
              ></div>
              <span className="text-gray-600">
                {result.service}: {result.status}
                {result.responseTime && ` (${result.responseTime}ms)`}
              </span>
            </div>
          ))}
        </div>
      )}

      {lastCheckTime && (
        <div className="text-xs text-gray-500 ml-4">
          Last checked: {new Date(lastCheckTime).toLocaleTimeString()}
        </div>
      )}
    </div>
  )
}
