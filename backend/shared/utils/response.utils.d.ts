interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
    metadata?: {
        timestamp: string;
        version: string;
        requestId?: string;
    };
}
export declare class ResponseUtils {
    static success<T>(data: T, message?: string, requestId?: string): ApiResponse<T>;
    static error(error: string, code?: string, details?: any, requestId?: string): ApiResponse;
    static created<T>(data: T, message?: string, requestId?: string): ApiResponse<T>;
    static updated<T>(data: T, message?: string, requestId?: string): ApiResponse<T>;
    static deleted(message?: string, requestId?: string): ApiResponse;
    static validationError(errors: string[], requestId?: string): ApiResponse;
    static unauthorized(message?: string, requestId?: string): ApiResponse;
    static forbidden(message?: string, requestId?: string): ApiResponse;
    static notFound(resource?: string, requestId?: string): ApiResponse;
}
export {};
//# sourceMappingURL=response.utils.d.ts.map