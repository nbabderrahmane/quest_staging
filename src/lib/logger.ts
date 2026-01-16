/**
 * Structured Logger for Ship Quest.
 * Outputs JSON logs to stdout for ingestion by monitoring tools.
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogEntry {
    ts: string
    level: LogLevel
    msg: string
    reqId?: string
    refId?: string
    action?: string
    durationMs?: number
    userId?: string
    [key: string]: unknown
}

class Logger {
    private log(level: LogLevel, msg: string, meta: Record<string, unknown> = {}) {
        const entry: LogEntry = {
            ts: new Date().toISOString(),
            level,
            msg,
            ...meta
        }
        // In production, strictly JSON. In dev, maybe pretty print? 
        // For "Production Hardening", we stick to consistent JSON.
        console.log(JSON.stringify(entry))
    }

    info(msg: string, meta?: Record<string, unknown>) {
        this.log('info', msg, meta)
    }

    warn(msg: string, meta?: Record<string, unknown>) {
        this.log('warn', msg, meta)
    }

    error(msg: string, meta?: Record<string, unknown>) {
        this.log('error', msg, meta)
    }

    debug(msg: string, meta?: Record<string, unknown>) {
        // Could filter by env var
        this.log('debug', msg, meta)
    }
}

export const logger = new Logger()
