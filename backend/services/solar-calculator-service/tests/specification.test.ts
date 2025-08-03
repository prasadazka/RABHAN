import { SolarCalculatorService } from '../src/services/solarCalculator.service';
import { ClientType, CalculationMode } from '../src/types/solar.types';

describe('Solar Calculator - Specification Compliance Tests', () => {
  let solarService: SolarCalculatorService;

  beforeEach(() => {
    solarService = new SolarCalculatorService();
  });

  describe('Example 1: Residential - Monthly Consumption 8000 kWh, 24 installments', () => {
    it('should match specification results exactly', async () => {
      const input = {
        mode: CalculationMode.MONTHLY_CONSUMPTION,
        clientType: ClientType.RESIDENTIAL,
        monthlyConsumption: 8000,
        numberOfInstallments: 24
      };

      const result = await solarService.calculate(input);

      // Expected results from specification
      expect(result.currentMonthlyBill).toBe(1680); // 1,680 SAR
      expect(result.solarPowerKWP).toBe(10); // 10 KWP
      expect(Math.round(result.monthlyProduction)).toBe(1583); // 1,583 KWH
      expect(result.systemPrice).toBe(22000); // 22,000 SAR
      expect(result.installmentValue).toBe(917); // 22000/24 = 916.67 ≈ 917
      expect(result.extraElectricityPayment).toBe(1205); // 1205.1 ≈ 1205
      expect(result.totalMonthlyPayment).toBe(2122); // 917 + 1205 = 2122
      expect(result.savingsPercentage).toBe(65); // 65%
      expect(result.monthlyCostIncrease).toBe(26); // 26%
    });
  });

  describe('Example 2: Commercial - Monthly Consumption 8000 kWh, 24 installments', () => {
    it('should match specification results exactly', async () => {
      const input = {
        mode: CalculationMode.MONTHLY_CONSUMPTION,
        clientType: ClientType.COMMERCIAL,
        monthlyConsumption: 8000,
        numberOfInstallments: 24
      };

      const result = await solarService.calculate(input);

      // Expected results from specification
      expect(result.currentMonthlyBill).toBe(1800); // 1,800 SAR
      expect(result.solarPowerKWP).toBe(10); // 10 KWP
      expect(Math.round(result.monthlyProduction)).toBe(1583); // 1,583 KWH
      expect(result.systemPrice).toBe(22000); // 22,000 SAR
      expect(result.installmentValue).toBe(917); // 22000/24 = 916.67 ≈ 917
      expect(result.extraElectricityPayment).toBe(1325); // 1325.1 ≈ 1325
      expect(result.totalMonthlyPayment).toBe(2242); // 917 + 1325 = 2242
      expect(result.savingsPercentage).toBe(52); // 52%
      expect(result.monthlyCostIncrease).toBe(25); // 25%
    });
  });

  describe('Example 3: Residential - Monthly Bill 2100 SAR, 24 installments', () => {
    it('should match specification results exactly', async () => {
      const input = {
        mode: CalculationMode.MONTHLY_BILL,
        clientType: ClientType.RESIDENTIAL,
        monthlyBill: 2100,
        numberOfInstallments: 24
      };

      const result = await solarService.calculate(input);

      // Expected results from specification
      expect(result.monthlyConsumption).toBe(9400); // 9,400 kWh
      expect(result.currentMonthlyBill).toBe(2100); // 2,100 SAR
      expect(result.solarPowerKWP).toBe(11); // 11 KWP
      expect(Math.round(result.monthlyProduction)).toBe(1742); // 1,742 KWH
      expect(result.systemPrice).toBe(24200); // 24,200 SAR
      expect(result.installmentValue).toBe(1008); // 24200/24 = 1008.33 ≈ 1008
      expect(result.extraElectricityPayment).toBe(1577); // 1577.4 ≈ 1577
      expect(result.totalMonthlyPayment).toBe(2585); // 1008 + 1577 = 2585
      expect(result.savingsPercentage).toBe(52); // 52%
      expect(result.monthlyCostIncrease).toBe(23); // 23%
    });
  });

  describe('Example 4: Commercial - Monthly Bill 2100 SAR, 24 installments', () => {
    it('should match specification results exactly', async () => {
      const input = {
        mode: CalculationMode.MONTHLY_BILL,
        clientType: ClientType.COMMERCIAL,
        monthlyBill: 2100,
        numberOfInstallments: 24
      };

      const result = await solarService.calculate(input);

      // Expected results from specification
      expect(result.monthlyConsumption).toBe(9000); // 9,000 kWh
      expect(result.currentMonthlyBill).toBe(2100); // 2,100 SAR
      expect(result.solarPowerKWP).toBe(10); // 10 KWP
      expect(Math.round(result.monthlyProduction)).toBe(1583); // 1,583 KWH
      expect(result.systemPrice).toBe(22000); // 22,000 SAR
      expect(result.installmentValue).toBe(917); // 22000/24 = 916.67 ≈ 917
      expect(result.extraElectricityPayment).toBe(1625); // 1625.1 ≈ 1625
      expect(result.totalMonthlyPayment).toBe(2542); // 917 + 1625 = 2542
      expect(result.savingsPercentage).toBe(52); // 52%
      expect(result.monthlyCostIncrease).toBe(21); // 21%
    });
  });

  describe('Edge Cases and Validation', () => {
    it('should handle minimum consumption correctly', async () => {
      const input = {
        mode: CalculationMode.MONTHLY_CONSUMPTION,
        clientType: ClientType.RESIDENTIAL,
        monthlyConsumption: 6000,
        numberOfInstallments: 24
      };

      const result = await solarService.calculate(input);
      expect(result.solarPowerKWP).toBe(10); // Minimum system size
      expect(result.currentMonthlyBill).toBe(1080); // Minimum bill
    });

    it('should handle maximum consumption correctly', async () => {
      const input = {
        mode: CalculationMode.MONTHLY_CONSUMPTION,
        clientType: ClientType.RESIDENTIAL,
        monthlyConsumption: 24000,
        numberOfInstallments: 24
      };

      const result = await solarService.calculate(input);
      expect(result.solarPowerKWP).toBe(25); // Maximum system size
    });

    it('should validate installment options', () => {
      const validOptions = solarService.getAvailableInstallmentOptions();
      expect(validOptions).toContain(12);
      expect(validOptions).toContain(18);
      expect(validOptions).toContain(24);
      expect(validOptions).toContain(30);
    });
  });
});