export enum ClientType {
  RESIDENTIAL = 'RESIDENTIAL',
  COMMERCIAL = 'COMMERCIAL'
}

export enum CalculationMode {
  MONTHLY_CONSUMPTION = 'MONTHLY_CONSUMPTION',
  MONTHLY_BILL = 'MONTHLY_BILL'
}

export interface SolarCalculationInput {
  mode: CalculationMode;
  clientType: ClientType;
  monthlyConsumption?: number;
  monthlyBill?: number;
  numberOfInstallments: number;
  customerId?: string;
}

export interface SolarPowerMapping {
  minConsumption: number;
  maxConsumption: number;
  requiredKWP: number;
  monthlyProduction: number;
}

export interface SolarCalculationResult {
  calculationId: string;
  clientType: ClientType;
  monthlyConsumption: number;
  solarPowerKWP: number;
  monthlyProduction: number;
  systemPrice: number;
  numberOfInstallments: number;
  installmentValue: number;
  extraElectricityPayment: number;
  totalMonthlyPayment: number;
  currentMonthlyBill: number;
  savingsPercentage: number;
  roiEstimate: number;
  monthlyCostIncrease: number;
  calculatedAt: Date;
}

export interface SolarConstants {
  KWP_TO_KWH_FACTOR: number;
  RESIDENTIAL_MIN_BILL: number;
  COMMERCIAL_MIN_BILL: number;
  ELECTRICITY_RATE: number;
  SYSTEM_PRICE_PER_KWP: number;
  MIN_CONSUMPTION_KWH: number;
  MAX_CONSUMPTION_KWH: number;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface AdminConfigurableValues {
  electricityRate: number;
  systemPricePerKWP: number;
  residentialMinBill: number;
  commercialMinBill: number;
  installmentOptions: number[];
  interestMultiplier?: number;
}