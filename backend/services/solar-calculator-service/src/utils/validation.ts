import Joi from 'joi';
import { ClientType, CalculationMode } from '../types/solar.types';

export const solarCalculationSchema = Joi.object({
  mode: Joi.string()
    .valid(...Object.values(CalculationMode))
    .required()
    .messages({
      'any.required': 'Calculation mode is required',
      'any.only': 'Invalid calculation mode'
    }),
  
  clientType: Joi.string()
    .valid(...Object.values(ClientType))
    .required()
    .messages({
      'any.required': 'Client type is required',
      'any.only': 'Client type must be either RESIDENTIAL or COMMERCIAL'
    }),
  
  monthlyConsumption: Joi.when('mode', {
    is: CalculationMode.MONTHLY_CONSUMPTION,
    then: Joi.number()
      .min(6000)
      .max(24000)
      .required()
      .messages({
        'number.min': 'Monthly consumption must be at least 6,000 KWH',
        'number.max': 'Monthly consumption cannot exceed 24,000 KWH',
        'any.required': 'Monthly consumption is required when using consumption mode'
      }),
    otherwise: Joi.forbidden()
  }),
  
  monthlyBill: Joi.when('mode', {
    is: CalculationMode.MONTHLY_BILL,
    then: Joi.when('clientType', {
      is: ClientType.RESIDENTIAL,
      then: Joi.number()
        .min(1080)
        .required()
        .messages({
          'number.min': 'Monthly bill must be at least 1,080 SAR for residential clients',
          'any.required': 'Monthly bill is required when using bill mode'
        }),
      otherwise: Joi.number()
        .min(1200)
        .required()
        .messages({
          'number.min': 'Monthly bill must be at least 1,200 SAR for commercial clients',
          'any.required': 'Monthly bill is required when using bill mode'
        })
    }),
    otherwise: Joi.forbidden()
  }),
  
  numberOfInstallments: Joi.number()
    .valid(12, 18, 24, 30, 36, 48, 60)
    .required()
    .messages({
      'any.required': 'Number of installments is required',
      'any.only': 'Invalid number of installments. Must be 12, 18, 24, 30, 36, 48, or 60'
    }),
  
  customerId: Joi.string()
    .uuid()
    .optional()
    .messages({
      'string.guid': 'Customer ID must be a valid UUID'
    })
});

export const adminConfigSchema = Joi.object({
  electricityRate: Joi.number()
    .positive()
    .precision(2)
    .optional()
    .messages({
      'number.positive': 'Electricity rate must be positive'
    }),
  
  systemPricePerKWP: Joi.number()
    .positive()
    .optional()
    .messages({
      'number.positive': 'System price per KWP must be positive'
    }),
  
  residentialMinBill: Joi.number()
    .positive()
    .optional()
    .messages({
      'number.positive': 'Residential minimum bill must be positive'
    }),
  
  commercialMinBill: Joi.number()
    .positive()
    .optional()
    .messages({
      'number.positive': 'Commercial minimum bill must be positive'
    }),
  
  installmentOptions: Joi.array()
    .items(Joi.number().positive())
    .optional()
    .messages({
      'array.base': 'Installment options must be an array of numbers'
    }),
  
  interestMultiplier: Joi.number()
    .min(1)
    .max(2)
    .precision(2)
    .optional()
    .messages({
      'number.min': 'Interest multiplier must be at least 1',
      'number.max': 'Interest multiplier cannot exceed 2'
    })
});