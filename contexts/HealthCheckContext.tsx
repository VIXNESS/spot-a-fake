'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { HealthCheckSummary } from '@/lib/utils/health-check'

interface HealthCheckContextType {
  healthStatus: HealthCheckSummary | null
  isCheckingHealth: boolean
  lastCheckTime: number | null
  recheckHealth: () => Promise<void>
}

const HealthCheckContext = createContext<HealthCheckContextType | undefined>(undefined)

export function HealthCheckProvider({ children }: { children: React.ReactNode }) {
  const [healthStatus, setHealthStatus] = useState<HealthCheckSummary | null>(null)
  const [isCheckingHealth, setIsCheckingHealth] = useState(false)
  const [lastCheckTime, setLastCheckTime] = useState<number | null>(null)

  const performHealthCheck = async (withLogging = false) => {
    setIsCheckingHealth(true)
    try {
      const response = await fetch('/api/health', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      // Always try to parse the response, even for error statuses
      const data = await response.json()

      if (!response.ok) {
        // If it's a 503, it means some services are unhealthy but we still got data
        if (response.status === 503) {
          console.warn(`Some API services are unhealthy (HTTP ${response.status})`)
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
      }
      
      // Transform the API response to match our HealthCheckSummary interface
      const summary: HealthCheckSummary = {
        allHealthy: data.status === 'healthy',
        results: data.services || [],
        timestamp: data.timestamp || Date.now(),
      }
      
      setHealthStatus(summary)
      setLastCheckTime(Date.now())

      if (withLogging) {
        console.log('🔍 API Health Check Results:')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        
        // Log environment configuration
        if (data.environment) {
          console.log('📋 Environment Configuration:')
          Object.entries(data.environment).forEach(([key, value]) => {
            const status = value === 'not configured' ? '❌' : '✅'
            console.log(`   ${status} ${key}: ${value}`)
          })
          console.log('')
        }
        
        summary.results.forEach(result => {
          const statusIcon = result.status === 'healthy' ? '✅' : '❌'
          const responseTimeText = result.responseTime ? ` (${result.responseTime}ms)` : ''
          
          console.log(`${statusIcon} ${result.service}: ${result.status.toUpperCase()}${responseTimeText}`)
          if (result.message) {
            console.log(`   └─ ${result.message}`)
          }
        })
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        
        if (summary.allHealthy) {
          console.log('✅ All API services are healthy!')
        } else {
          console.warn('⚠️  Some API services are not responding properly.')
          console.log('💡 This is expected if your API services are not running yet.')
        }
        
        console.log('')
      }
    } catch (error) {
      console.error('Health check failed:', error)
      // Set a failed state
      setHealthStatus({
        allHealthy: false,
        results: [],
        timestamp: Date.now(),
      })
      setLastCheckTime(Date.now())
    } finally {
      setIsCheckingHealth(false)
    }
  }

  const recheckHealth = async () => {
    await performHealthCheck(true)
  }

  // Run health check on app launch
  useEffect(() => {
    // Only run on client side and when not already checking
    if (typeof window !== 'undefined' && !isCheckingHealth) {
      performHealthCheck(true)
    }
  }, []) // Empty dependency array means this runs once on mount

  const value: HealthCheckContextType = {
    healthStatus,
    isCheckingHealth,
    lastCheckTime,
    recheckHealth,
  }

  return (
    <HealthCheckContext.Provider value={value}>
      {children}
    </HealthCheckContext.Provider>
  )
}

export function useHealthCheck() {
  const context = useContext(HealthCheckContext)
  if (context === undefined) {
    throw new Error('useHealthCheck must be used within a HealthCheckProvider')
  }
  return context
}
