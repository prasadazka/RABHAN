import { Request, Response, NextFunction } from 'express';
import { Schema } from 'joi';
import { SAMALogger } from '../utils/logger';

export const validate = (schema: Schema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      SAMALogger.logAuthEvent('VALIDATION_ERROR', undefined, {
        path: req.path,
        errors,
        ip: req.ip
      });
      
      res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
      return;
    }
    
    // Replace req.body with validated and sanitized data
    req.body = value;
    next();
  };
};

export const validateQuery = (schema: Schema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true
    });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      res.status(400).json({
        error: 'Query validation failed',
        details: errors
      });
      return;
    }
    
    req.query = value;
    next();
  };
};

export const validateParams = (schema: Schema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true
    });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      res.status(400).json({
        error: 'Parameter validation failed',
        details: errors
      });
      return;
    }
    
    req.params = value;
    next();
  };
};