/**
 * Simple Error Logging Utility
 * 
 * For production, consider integrating with:
 * - Sentry (https://sentry.io)
 * - LogRocket (https://logrocket.com)
 * - Datadog (https://www.datadoghq.com)
 * - New Relic (https://newrelic.com)
 */

export interface LogContext {
  userId?: string
  endpoint?: string
  method?: string
  statusCode?: number
  duration?: number
  ip?: string
  userAgent?: string
  [key: string]: any
}

export class Logger {
  private static instance: Logger
  
  private constructor() {}
  
  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger()
    }
    return Logger.instance
  }

  /**
   * Log an error with context
   */
  error(message: string, error?: Error, context?: LogContext) {
    const timestamp = new Date().toISOString()
    const logEntry = {
      level: 'ERROR',
      timestamp,
      message,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : undefined,
      context,
      environment: process.env.NODE_ENV,
    }

    // Console logging (always)
    console.error('[ERROR]', JSON.stringify(logEntry, null, 2))

    // In production, send to external service
    if (process.env.NODE_ENV === 'production') {
      this.sendToExternalService(logEntry)
    }
  }

  /**
   * Log a warning
   */
  warn(message: string, context?: LogContext) {
    const timestamp = new Date().toISOString()
    const logEntry = {
      level: 'WARN',
      timestamp,
      message,
      context,
      environment: process.env.NODE_ENV,
    }

    console.warn('[WARN]', JSON.stringify(logEntry, null, 2))

    if (process.env.NODE_ENV === 'production') {
      this.sendToExternalService(logEntry)
    }
  }

  /**
   * Log info (debug purposes)
   */
  info(message: string, context?: LogContext) {
    if (process.env.NODE_ENV === 'development') {
      const timestamp = new Date().toISOString()
      console.log('[INFO]', timestamp, message, context || '')
    }
  }

  /**
   * Log security events (authentication failures, rate limits, etc.)
   */
  security(message: string, context?: LogContext) {
    const timestamp = new Date().toISOString()
    const logEntry = {
      level: 'SECURITY',
      timestamp,
      message,
      context,
      environment: process.env.NODE_ENV,
    }

    console.warn('[SECURITY]', JSON.stringify(logEntry, null, 2))

    // Always send security events to external service in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToExternalService(logEntry)
    }
  }

  /**
   * Log performance metrics
   */
  performance(endpoint: string, duration: number, context?: LogContext) {
    if (duration > 1000) { // Log slow requests (> 1 second)
      const logEntry = {
        level: 'PERFORMANCE',
        timestamp: new Date().toISOString(),
        message: `Slow request detected: ${endpoint}`,
        duration,
        context,
      }

      console.warn('[PERFORMANCE]', JSON.stringify(logEntry, null, 2))

      if (process.env.NODE_ENV === 'production') {
        this.sendToExternalService(logEntry)
      }
    }
  }

  /**
   * Send logs to external service (Sentry, LogRocket, etc.)
   * Implement based on your chosen service
   */
  private sendToExternalService(logEntry: any) {
    // TODO: Integrate with your logging service
    // Example for Sentry:
    // if (process.env.SENTRY_DSN) {
    //   Sentry.captureException(logEntry)
    // }
    
    // For now, just ensure it's logged
    // In production, you would send this to your monitoring service
  }
}

// Export singleton instance
export const logger = Logger.getInstance()

// Convenience functions
export function logError(message: string, error?: Error, context?: LogContext) {
  logger.error(message, error, context)
}

export function logWarn(message: string, context?: LogContext) {
  logger.warn(message, context)
}

export function logInfo(message: string, context?: LogContext) {
  logger.info(message, context)
}

export function logSecurity(message: string, context?: LogContext) {
  logger.security(message, context)
}

export function logPerformance(endpoint: string, duration: number, context?: LogContext) {
  logger.performance(endpoint, duration, context)
}

