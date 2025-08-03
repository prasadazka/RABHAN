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

interface ErrorDetails {
  code?: string;
  details?: any;
}

export class ResponseUtils {
  
  static success<T>(data: T, message?: string, requestId?: string): ApiResponse<T> {
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

  static error(error: string, code?: string, details?: any, requestId?: string): ApiResponse {
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

  static created<T>(data: T, message?: string, requestId?: string): ApiResponse<T> {
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

  static updated<T>(data: T, message?: string, requestId?: string): ApiResponse<T> {
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

  static deleted(message?: string, requestId?: string): ApiResponse {
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

  static validationError(errors: string[], requestId?: string): ApiResponse {
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

  static unauthorized(message?: string, requestId?: string): ApiResponse {
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

  static forbidden(message?: string, requestId?: string): ApiResponse {
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

  static notFound(resource?: string, requestId?: string): ApiResponse {
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