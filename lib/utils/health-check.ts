export interface HealthCheckResult {
  service: string
  url: string
  status: 'healthy' | 'unhealthy' | 'unknown'
  message?: string
  responseTime?: number
}

export interface HealthCheckSummary {
  allHealthy: boolean
  results: HealthCheckResult[]
  timestamp: number
}

/**
 * Check the health of a single API endpoint
 */
async function checkSingleEndpoint(
  service: string, 
  url: string, 
  healthPath: string = '/health',
  timeout = 5000
): Promise<HealthCheckResult> {
  const startTime = Date.now()
  
  try {
    // Create AbortController for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)
    
    const response = await fetch(`${url}${healthPath}`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    clearTimeout(timeoutId)
    const responseTime = Date.now() - startTime
    
    if (response.ok) {
      // Try to parse response body for additional info
      let responseBody = ''
      try {
        const body = await response.json()
        responseBody = JSON.stringify(body)
      } catch {
        // Ignore parsing errors, use default message
        responseBody = `HTTP ${response.status}`
      }
      
      return {
        service,
        url,
        status: 'healthy',
        message: `${responseBody}`,
        responseTime,
      }
    } else {
      return {
        service,
        url,
        status: 'unhealthy',
        message: `HTTP ${response.status}: ${response.statusText}`,
        responseTime,
      }
    }
  } catch (error) {
    const responseTime = Date.now() - startTime
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          service,
          url,
          status: 'unhealthy',
          message: `Timeout after ${timeout}ms`,
          responseTime,
        }
      }
      
      return {
        service,
        url,
        status: 'unhealthy',
        message: error.message,
        responseTime,
      }
    }
    
    return {
      service,
      url,
      status: 'unknown',
      message: 'Unknown error occurred',
      responseTime,
    }
  }
}

/**
 * Check the health of all configured API services (server-side only)
 */
export async function checkAllServices(): Promise<HealthCheckSummary> {
  // This should only run on the server side
  if (typeof window !== 'undefined') {
    throw new Error('checkAllServices should only be called on the server side')
  }

  const services = [
    { 
      name: 'YOLO API', 
      url: process.env.YOLO_API_URL,
      healthPath: '/healthcheck'  // YOLO uses /healthcheck endpoint
    },
    { 
      name: 'Segformer API', 
      url: process.env.SEGFORMER_API_URL,
      healthPath: '/health'       // Default /health endpoint
    },
    { 
      name: 'LLM API', 
      url: process.env.LLM_API_URL,
      healthPath: '/health'       // Default /health endpoint
    },
  ]

  // Filter out services that don't have URLs configured
  const configuredServices = services.filter(service => service.url)
  
  if (configuredServices.length === 0) {
    return {
      allHealthy: false,
      results: [],
      timestamp: Date.now(),
    }
  }

  // Check all services in parallel
  const results = await Promise.all(
    configuredServices.map(service => 
      checkSingleEndpoint(service.name, service.url!, service.healthPath)
    )
  )

  const allHealthy = results.every(result => result.status === 'healthy')

  return {
    allHealthy,
    results,
    timestamp: Date.now(),
  }
}

/**
 * Log health check results to console
 */
export function logHealthCheckResults(summary: HealthCheckSummary): void {
  console.log('🔍 API Health Check Results:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  
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
  }
  
  console.log('')
}

/**
 * Run health check and log results (for server-side usage)
 */
export async function runHealthCheckWithLogging(): Promise<HealthCheckSummary> {
  console.log('🚀 Starting API health checks...')
  
  try {
    const summary = await checkAllServices()
    logHealthCheckResults(summary)
    return summary
  } catch (error) {
    console.error('❌ Failed to run health checks:', error)
    throw error
  }
}
