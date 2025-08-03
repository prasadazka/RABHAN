"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponseUtils = void 0;
class ResponseUtils {
    static success(data, message, requestId) {
        return {
            success: true,
            data,
            message,
            metadata: {
                timestamp: new Date().toISOString(),
                version: process.env.SERVICE_VERSION || '1.0.0',
                requestId
            }
        };
    }
    static error(error, code, details, requestId) {
        return {
            success: false,
            error,
            ...(code && { code }),
            ...(details && { details }),
            metadata: {
                timestamp: new Date().toISOString(),
                version: process.env.SERVICE_VERSION || '1.0.0',
                requestId
            }
        };
    }
    static created(data, message, requestId) {
        return {
            success: true,
            data,
            message: message || 'Resource created successfully',
            metadata: {
                timestamp: new Date().toISOString(),
                version: process.env.SERVICE_VERSION || '1.0.0',
                requestId
            }
        };
    }
    static updated(data, message, requestId) {
        return {
            success: true,
            data,
            message: message || 'Resource updated successfully',
            metadata: {
                timestamp: new Date().toISOString(),
                version: process.env.SERVICE_VERSION || '1.0.0',
                requestId
            }
        };
    }
    static deleted(message, requestId) {
        return {
            success: true,
            message: message || 'Resource deleted successfully',
            metadata: {
                timestamp: new Date().toISOString(),
                version: process.env.SERVICE_VERSION || '1.0.0',
                requestId
            }
        };
    }
    static validationError(errors, requestId) {
        return {
            success: false,
            error: 'Validation failed',
            details: { errors },
            metadata: {
                timestamp: new Date().toISOString(),
                version: process.env.SERVICE_VERSION || '1.0.0',
                requestId
            }
        };
    }
    static unauthorized(message, requestId) {
        return {
            success: false,
            error: message || 'Unauthorized access',
            metadata: {
                timestamp: new Date().toISOString(),
                version: process.env.SERVICE_VERSION || '1.0.0',
                requestId
            }
        };
    }
    static forbidden(message, requestId) {
        return {
            success: false,
            error: message || 'Access denied',
            metadata: {
                timestamp: new Date().toISOString(),
                version: process.env.SERVICE_VERSION || '1.0.0',
                requestId
            }
        };
    }
    static notFound(resource, requestId) {
        return {
            success: false,
            error: resource ? `${resource} not found` : 'Resource not found',
            metadata: {
                timestamp: new Date().toISOString(),
                version: process.env.SERVICE_VERSION || '1.0.0',
                requestId
            }
        };
    }
}
exports.ResponseUtils = ResponseUtils;
//# sourceMappingURL=response.utils.js.map