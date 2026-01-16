import { randomUUID } from 'crypto'
import { Result, AppError } from './result'
import { logger } from './logger'

/**
 * Standardized response type for safe actions.
 * @deprecated Use Result<T> instead.
 */
export type ActionError = {
    success: false
    error: string
    refId?: string
}

/**
 * @deprecated Use runAction() instead.
 */
export async function safeAction<T>(
    actionName: string,
    fn: () => Promise<T>
): Promise<T | ActionError> {
    try {
        return await fn()
    } catch (error: unknown) {
        const uuid = randomUUID()
        const refId = `ERR-${uuid.slice(0, 8).toUpperCase()}`

        const errorMessage = error instanceof Error ? error.message : String(error)
        logger.error(`Legacy Action Failed: ${actionName}`, { refId, error: errorMessage })

        return {
            success: false,
            error: `System Encountered an Anomaly (Ref: ${refId})`,
            refId
        }
    }
}

/**
 * World-Class Standard Action Wrapper.
 * Enforces strict Result<T> contract.
 * automatic correlation IDs, timing, and structured logging.
 */
export async function runAction<T>(
    actionName: string,
    fn: () => Promise<Result<T>>
): Promise<Result<T>> {
    const start = performance.now()
    const refId = randomUUID().slice(0, 8).toUpperCase() // short ref for internal errors

    try {
        logger.info(`Action Start: ${actionName}`, { refId })

        // Execute domain logic
        const result = await fn()

        const durationMs = Math.floor(performance.now() - start)

        if (result.success) {
            logger.info(`Action Success: ${actionName}`, { refId, durationMs })
        } else {
            logger.warn(`Action Logic Error: ${actionName}`, {
                refId,
                durationMs,
                code: result.error.code,
                msg: result.error.message
            })
        }

        return result

    } catch (error: unknown) {
        const durationMs = Math.floor(performance.now() - start)
        const errorMessage = error instanceof Error ? error.message : String(error)
        const errorStack = error instanceof Error ? error.stack : undefined

        logger.error(`Action System Failure: ${actionName}`, {
            refId,
            durationMs,
            error: errorMessage,
            stack: errorStack
        })

        return {
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: `System Error (Ref: ${refId})`,
                refId,
                details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
            }
        }
    }
}
