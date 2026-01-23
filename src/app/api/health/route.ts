import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Health Check Endpoint
 * GET /api/health
 * 
 * Returns system health status including:
 * - Overall status
 * - Database connectivity
 * - Timestamp
 */
export async function GET() {
    const startTime = Date.now()

    const health: {
        status: 'healthy' | 'degraded' | 'unhealthy'
        timestamp: string
        checks: {
            database: { status: 'ok' | 'error'; latencyMs?: number; error?: string }
        }
        version: string
    } = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        checks: {
            database: { status: 'ok' }
        },
        version: process.env.npm_package_version || '0.1.0'
    }

    // Check database connectivity
    try {
        const supabase = await createClient()
        const dbStart = Date.now()
        const { error } = await supabase.from('teams').select('id').limit(1)
        const dbLatency = Date.now() - dbStart

        if (error) {
            health.checks.database = {
                status: 'error',
                error: error.message,
                latencyMs: dbLatency
            }
            health.status = 'degraded'
        } else {
            health.checks.database.latencyMs = dbLatency
        }
    } catch (err: unknown) {
        health.checks.database = {
            status: 'error',
            error: err instanceof Error ? err.message : 'Unknown error'
        }
        health.status = 'unhealthy'
    }

    const totalLatency = Date.now() - startTime

    return NextResponse.json({
        ...health,
        responseTimeMs: totalLatency
    }, {
        status: health.status === 'unhealthy' ? 503 : 200
    })
}
