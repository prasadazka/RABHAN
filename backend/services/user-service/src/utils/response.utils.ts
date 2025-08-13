// Temporary local ResponseUtils to avoid shared dependency issues
import { Response } from 'express';

export class ResponseUtils {
  static success(res: Response, data: any, message?: string, status?: number) {
    return res.status(status || 200).json({
      success: true,
      data,
      message,
      timestamp: new Date().toISOString()
    });
  }

  static error(res: Response, error: string, code?: string, status?: number) {
    return res.status(status || 400).json({
      success: false,
      error,
      code,
      timestamp: new Date().toISOString()
    });
  }

  static created(res: Response, data: any, message?: string) {
    return res.status(201).json({
      success: true,
      data,
      message: message || 'Resource created successfully',
      timestamp: new Date().toISOString()
    });
  }

  static noContent(res: Response) {
    return res.status(204).send();
  }
}