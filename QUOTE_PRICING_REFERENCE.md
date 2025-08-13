# Quote Pricing Structure Reference

## Fixed Pricing Rules
- **Rabhan Commission**: 15% (platform fee from contractor)
- **Rabhan Over Price**: 10% (markup for user)
- **VAT**: 15% (on total before VAT)

## Calculation Formula Per Line Item

1. **Total Price** = Units × Unit Price
2. **Rabhan Commission** = Total Price × 15%
3. **Rabhan Over Price** = Total Price × 10%
4. **User Price** = Total Price + Rabhan Over Price
5. **Vendor Net Price** = Total Price - Rabhan Commission

## Complete Example - 10KW Solar System Quote

| S/N | Item | Description | No# Units | Unit Price | Total Price | Rabhan Commission | Rabhan Over Price | User Price | Vendor Net Price |
|-----|------|-------------|-----------|------------|-------------|------------------|-------------------|------------|------------------|
| 1 | Solar Panel | 450W efficiency | 18 | 400 | 7,200 | 1,080 | 720 | 7,920 | 6,120 |
| 2 | Inverter | Hybrid - 10KW | 1 | 4,500 | 4,500 | 675 | 450 | 4,950 | 3,825 |
| 3 | Batteries | LifePO4 - 15KWH | 1 | 9,000 | 9,000 | 1,350 | 900 | 9,900 | 7,650 |
| 4 | Other | Stands & wires | 1 | 2,000 | 2,000 | 300 | 200 | 2,200 | 1,700 |

## Totals Calculation

| Description | Amount (SAR) |
|-------------|--------------|
| **Total Price** | 22,700 |
| **Rabhan Commission** | 3,405 |
| **Rabhan Over Price** | 2,270 |
| **User Price** | 24,970 |
| **Vendor Net Price** | 19,295 |
| **VAT (15% on Vendor Net)** | 2,894 |
| **Total Payable** | 22,189 |

### Summary Breakdown:
- **User Pays**: 24,970 SAR (User Price - no VAT for user)
- **Contractor Gets**: 22,189 SAR (19,295 + 2,894 VAT)
- **Rabhan Earns**: 5,675 SAR (3,405 commission + 2,270 over price)
- **Government Gets**: 2,894 SAR (VAT from contractor)

## Complete Contractor Quotation Structure

### 1. Quote Information Fields:
- **Vendor/Contractor Code**: Unique contractor identifier
- **Vendor/Contractor VAT Number**: Tax registration number
- **Quote Date**: Date of quote submission
- **Provided to User Number (Code)**: User identifier/code
- **Installation Deadline**: dd/mm/yyyy format
- **Payment Terms**: 
  - Option 1: Wallet Credit
  - Option 2: Bank Transfer

### 2. Solar System General Information:
- **Solar System Capacity**: ___ kWp
- **Storage Capacity**: ___ kWh  
- **Average Monthly Power Production**: ___ kWh

### 3. Quotation Body (Line Items):
- Item name
- Description/specifications  
- Number of units
- Unit price
- (All calculations auto-generated)

## Implementation Notes

### Contractor Input Fields:

### System Auto-Calculations:
- All commission and markup calculations
- VAT calculation on final total
- Net amounts for all parties

### User Display:
- Complete itemized breakdown
- Transparent pricing showing all fees
- Final total with VAT included

### Admin Approval:
- Review each line item for reasonableness
- Verify technical specifications
- Approve/reject entire quote