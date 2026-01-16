/**
 * Standard Result type for all Server Actions.
 * Discriminated union for strict type safety.
 */
export type Result<T> =
    | { success: true; data: T }
    | { success: false; error: AppError }

export type AppError = {
    code: ErrorCode
    message: string
    refId?: string // Correlation ID for support
    details?: unknown
}

export type ErrorCode =
    | 'UNAUTHORIZED'    // 401/403
    | 'NOT_FOUND'       // 404
    | 'VALIDATION_ERROR'// 400
    | 'DB_ERROR'        // 500 DB
    | 'INTERNAL_ERROR'  // 500 Generic
    | 'CONFLICT'        // 409
