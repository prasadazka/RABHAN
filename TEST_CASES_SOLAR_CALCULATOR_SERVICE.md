# Test Cases - Solar Calculator Service

## Service Overview
**Service**: Solar Calculator Service  
**Port**: 3005  
**Technology**: Node.js/TypeScript  
**Database**: PostgreSQL (calculations cache)  
**Dependencies**: User Service (for preferences), Location Services (for solar data)

---

## TC-SOLAR-001: Basic Solar Calculations

### TC-SOLAR-001-001: Calculate System Size for Residential Property
**Priority**: High  
**Type**: Positive Test  

**Test Data**:
```json
{
  "propertyType": "VILLA",
  "roofSize": 200,
  "electricityConsumption": 2000,
  "location": {
    "latitude": 24.7136,
    "longitude": 46.6753,
    "city": "Riyadh"
  },
  "budgetRange": "50K_100K",
  "energyGoal": "OFFSET_100_PERCENT"
}
```

**Steps**:
1. Send POST request to `/api/solar-calculator/calculate`
2. Verify response status is 200
3. Verify system size calculated correctly
4. Verify calculations include all required components
5. Verify response time < 1 second

**Expected Results**:
- Recommended system size: ~13-15 kW (based on 2000 kWh consumption)
- Number of panels calculated (assuming 400W panels)
- Inverter specifications provided
- Roof utilization percentage calculated
- Energy production estimates provided
- All calculations mathematically accurate

### TC-SOLAR-001-002: Calculate for Different Property Types
**Priority**: High  
**Type**: Business Logic Test  

**Test Scenarios**:
```json
[
  {
    "propertyType": "APARTMENT",
    "roofSize": 50,
    "consumption": 800,
    "expectedSystemSize": "4-5 kW"
  },
  {
    "propertyType": "VILLA", 
    "roofSize": 300,
    "consumption": 3000,
    "expectedSystemSize": "18-22 kW"
  },
  {
    "propertyType": "TOWNHOUSE",
    "roofSize": 120,
    "consumption": 1500,
    "expectedSystemSize": "10-12 kW"
  }
]
```

**Steps**:
1. Test each property type scenario
2. Verify system size appropriate for property type
3. Verify roof utilization optimized
4. Verify component selections appropriate

**Expected Results**:
- System sizes scaled appropriately
- Component selections match property requirements
- Roof utilization calculations accurate
- Installation considerations included

### TC-SOLAR-001-003: Energy Production Estimation
**Priority**: High  
**Type**: Business Logic Test  

**Test Data**:
```json
{
  "systemSize": 10,
  "location": {
    "latitude": 24.7136,
    "longitude": 46.6753,
    "solarIrradiance": 6.2
  },
  "panelEfficiency": 0.20,
  "systemEfficiency": 0.85
}
```

**Steps**:
1. Calculate annual energy production
2. Verify monthly production estimates
3. Verify seasonal variations included
4. Verify degradation factors applied

**Expected Results**:
- Annual production: ~18,700 kWh (10kW × 6.2 × 365 × 0.85)
- Monthly variations calculated correctly
- Summer/winter production differences shown
- System degradation over time included

---

## TC-SOLAR-002: Financial Analysis

### TC-SOLAR-002-001: Calculate Return on Investment (ROI)
**Priority**: High  
**Type**: Business Logic Test  

**Test Data**:
```json
{
  "systemCost": 75000,
  "annualSavings": 12000,
  "electricityRateIncrease": 0.03,
  "systemLifespan": 25,
  "maintenanceCostAnnual": 500
}
```

**Steps**:
1. Calculate payback period
2. Calculate 25-year ROI
3. Calculate NPV (Net Present Value)
4. Verify financial projections

**Expected Results**:
- Payback period: ~6.25 years
- 25-year savings: ~SAR 375,000
- ROI: ~400%
- NPV calculation with discount rate
- Financial projections accurate

### TC-SOLAR-002-002: Electricity Cost Savings Analysis
**Priority**: High  
**Type**: Business Logic Test  

**Test Data**:
```json
{
  "currentMonthlyBill": 800,
  "systemProduction": 1500,
  "currentConsumption": 1200,
  "electricityRate": 0.18,
  "netMeteringPolicy": true
}
```

**Steps**:
1. Calculate monthly savings with net metering
2. Calculate without net metering (self-consumption only)
3. Verify savings calculations accurate
4. Include electricity rate escalation

**Expected Results**:
- Monthly savings with net metering: ~SAR 700-750
- Self-consumption savings: ~SAR 600-650
- Excess energy credit calculated
- Rate escalation impact shown
- Savings projections over system lifetime

### TC-SOLAR-002-003: Financing Options Analysis
**Priority**: Medium  
**Type**: Business Logic Test  

**Test Data**:
```json
{
  "systemCost": 75000,
  "downPayment": 15000,
  "loanAmount": 60000,
  "interestRate": 0.05,
  "loanTerm": 7,
  "bnplEligible": true,
  "bnplMaxAmount": 50000
}
```

**Steps**:
1. Calculate loan payment scenarios
2. Calculate BNPL options if eligible
3. Compare cash vs financing ROI
4. Verify all financing calculations

**Expected Results**:
- Monthly loan payment calculated accurately
- BNPL payment options shown
- Total cost of financing displayed
- ROI comparison between payment methods
- Clear financing recommendations

---

## TC-SOLAR-003: Location-Based Calculations

### TC-SOLAR-003-001: Solar Irradiance by Saudi Cities
**Priority**: High  
**Type**: Business Logic Test  

**Test Locations**:
```json
[
  {"city": "Riyadh", "expectedIrradiance": 6.2},
  {"city": "Jeddah", "expectedIrradiance": 6.8}, 
  {"city": "Dammam", "expectedIrradiance": 5.9},
  {"city": "Tabuk", "expectedIrradiance": 6.5},
  {"city": "Abha", "expectedIrradiance": 6.0}
]
```

**Steps**:
1. Calculate solar potential for each city
2. Verify irradiance data accuracy
3. Verify seasonal variations included
4. Compare production estimates

**Expected Results**:
- Irradiance values match regional solar data
- Seasonal variations reflected accurately
- City-specific production estimates
- Weather pattern considerations included

### TC-SOLAR-003-002: Roof Orientation and Tilt Optimization
**Priority**: Medium  
**Type**: Business Logic Test  

**Test Data**:
```json
{
  "latitude": 24.7136,
  "roofOrientation": 180,
  "roofTilt": 25,
  "shadingFactor": 0.95
}
```

**Steps**:
1. Calculate optimal tilt angle for latitude
2. Verify orientation impact on production
3. Calculate shading losses
4. Provide optimization recommendations

**Expected Results**:
- Optimal tilt: ~24° for Riyadh latitude
- South-facing orientation preferred
- Shading losses calculated accurately
- Alternative orientations analyzed

### TC-SOLAR-003-003: Weather Impact on Performance
**Priority**: Medium  
**Type**: Business Logic Test  

**Steps**:
1. Include dust factor in calculations (Saudi-specific)
2. Account for temperature coefficient
3. Include humidity impact
4. Verify seasonal performance variations

**Expected Results**:
- Dust losses: ~10-15% annually in Saudi Arabia
- Temperature derating applied correctly
- Seasonal performance curves accurate
- Weather impact clearly communicated

---

## TC-SOLAR-004: System Sizing and Component Selection

### TC-SOLAR-004-001: Panel Selection and Sizing
**Priority**: High  
**Type**: Business Logic Test  

**Test Data**:
```json
{
  "targetSystemSize": 10,
  "availableRoofSpace": 80,
  "panelOptions": [
    {"power": 400, "efficiency": 0.20, "size": "2m x 1m"},
    {"power": 450, "efficiency": 0.22, "size": "2.2m x 1.1m"},
    {"power": 500, "efficiency": 0.21, "size": "2.3m x 1.2m"}
  ]
}
```

**Steps**:
1. Calculate number of panels needed
2. Verify roof space utilization
3. Recommend optimal panel type
4. Calculate system layout

**Expected Results**:
- Panel quantity: 20-25 panels (depending on wattage)
- Roof utilization: 60-80%
- Optimal panel recommendation based on efficiency/space
- System layout feasible within roof constraints

### TC-SOLAR-004-002: Inverter Selection
**Priority**: High  
**Type**: Business Logic Test  

**Test Data**:
```json
{
  "systemSize": 10,
  "panelConfiguration": "string",
  "gridTieRequirements": true,
  "batteryBackup": false
}
```

**Steps**:
1. Calculate required inverter capacity
2. Select appropriate inverter type
3. Verify DC to AC ratio
4. Include safety margins

**Expected Results**:
- Inverter size: 8-10 kW (0.8-1.0 DC/AC ratio)
- String inverter vs power optimizer recommendation
- Grid-tie requirements met
- Safety margins included (10-20%)

### TC-SOLAR-004-003: Battery Storage Calculations (Optional)
**Priority**: Medium  
**Type**: Business Logic Test  

**Test Data**:
```json
{
  "dailyEnergyUsage": 50,
  "backupHours": 8,
  "batteryType": "lithium_ion",
  "depthOfDischarge": 0.9,
  "systemVoltage": 48
}
```

**Steps**:
1. Calculate required battery capacity
2. Verify backup duration achievable
3. Calculate battery cost impact
4. Include battery degradation

**Expected Results**:
- Battery capacity: ~45 kWh for 8-hour backup
- Cost impact on ROI calculated
- Battery lifespan and warranty included
- Backup scenarios clearly outlined

---

## TC-SOLAR-005: Advanced Calculations

### TC-SOLAR-005-001: Shading Analysis
**Priority**: Medium  
**Type**: Business Logic Test  

**Test Data**:
```json
{
  "shadingObstructions": [
    {"type": "building", "height": 10, "distance": 20, "direction": 180},
    {"type": "tree", "height": 8, "distance": 15, "direction": 225}
  ],
  "roofHeight": 5
}
```

**Steps**:
1. Calculate shading impact on production
2. Verify seasonal shading variations
3. Recommend mitigation strategies
4. Update production estimates

**Expected Results**:
- Shading losses: 5-15% depending on obstructions
- Seasonal variation in shading calculated
- Power optimizer recommendations for shaded areas
- Production estimates adjusted accordingly

### TC-SOLAR-005-002: Grid-Tie and Net Metering Analysis
**Priority**: High  
**Type**: Business Logic Test  

**Test Data**:
```json
{
  "netMeteringPolicy": "1:1_credit",
  "interconnectionFee": 500,
  "utilityRequirements": {
    "maxSystemSize": 1000,
    "gridStabilityRequirements": true
  }
}
```

**Steps**:
1. Verify system meets utility requirements
2. Calculate net metering benefits
3. Include interconnection costs
4. Analyze export limitations

**Expected Results**:
- System complies with utility requirements
- Net metering benefits calculated accurately
- Interconnection costs included in ROI
- Export limitations considered

### TC-SOLAR-005-003: Commercial vs Residential Calculations
**Priority**: Medium  
**Type**: Business Logic Test  

**Test Scenarios**:
```json
[
  {
    "type": "residential",
    "consumption": 2000,
    "tariff": "residential_block",
    "netMetering": true
  },
  {
    "type": "commercial", 
    "consumption": 10000,
    "tariff": "commercial_time_of_use",
    "demandCharges": true
  }
]
```

**Steps**:
1. Apply appropriate tariff structures
2. Calculate demand charge savings (commercial)
3. Verify time-of-use optimization
4. Compare residential vs commercial economics

**Expected Results**:
- Tariff structures applied correctly
- Demand charge savings calculated (commercial)
- Time-of-use benefits optimized
- Economics comparison accurate

---

## TC-SOLAR-006: Input Validation

### TC-SOLAR-006-001: Validate Required Input Parameters
**Priority**: High  
**Type**: Negative Test  

**Test Data**:
```json
{
  "propertyType": "",
  "electricityConsumption": null,
  "location": {}
}
```

**Steps**:
1. Send request with missing required fields
2. Verify response status is 400
3. Verify validation errors returned
4. Verify specific field errors listed

**Expected Results**:
- Request rejected with 400 status
- Validation errors for each missing field
- Clear error messages provided
- No calculation attempted

### TC-SOLAR-006-002: Validate Numeric Input Ranges
**Priority**: High  
**Type**: Negative Test  

**Test Data**:
```json
{
  "roofSize": -10,
  "electricityConsumption": 1000000,
  "latitude": 200,
  "longitude": -300
}
```

**Steps**:
1. Send request with out-of-range values
2. Verify validation errors for each field
3. Verify reasonable limits enforced
4. Verify error messages informative

**Expected Results**:
- All out-of-range values rejected
- Reasonable limits enforced (roof size > 0, consumption < 100,000 kWh)
- GPS coordinates validated for Saudi Arabia
- Clear guidance on valid ranges

### TC-SOLAR-006-003: Validate Energy Goal Compatibility
**Priority**: Medium  
**Type**: Business Logic Test  

**Test Data**:
```json
{
  "electricityConsumption": 500,
  "roofSize": 20,
  "energyGoal": "OFFSET_100_PERCENT"
}
```

**Steps**:
1. Verify roof size can support energy goal
2. Calculate maximum possible system size
3. Provide recommendations if goal unachievable
4. Suggest alternatives

**Expected Results**:
- Compatibility check performed
- Maximum system size calculated
- Alternative goals suggested if needed
- Clear explanations provided

---

## TC-SOLAR-007: Performance and Scalability

### TC-SOLAR-007-001: Calculation Response Time
**Priority**: High  
**Target**: < 1 second response time

**Steps**:
1. Execute 100 concurrent calculation requests
2. Measure average response time
3. Verify 95th percentile < 1 second
4. Monitor resource usage

**Expected Results**:
- Average response time < 500ms
- 95th percentile < 1 second
- System handles concurrent requests
- Resource usage reasonable

### TC-SOLAR-007-002: Complex Calculation Performance
**Priority**: Medium  
**Target**: < 2 seconds for advanced calculations

**Test Data**:
```json
{
  "includeShading": true,
  "includeBattery": true,
  "includeFinancing": true,
  "include25YearProjection": true,
  "includeWeatherAnalysis": true
}
```

**Steps**:
1. Execute complex calculations with all options
2. Measure processing time
3. Verify accuracy not compromised
4. Test with multiple concurrent requests

**Expected Results**:
- Complex calculations complete within 2 seconds
- Accuracy maintained with increased complexity
- Concurrent complex requests handled
- Resource usage scales appropriately

### TC-SOLAR-007-003: Calculation Caching
**Priority**: Medium  
**Type**: Performance Test  

**Steps**:
1. Execute identical calculation requests
2. Verify caching mechanism works
3. Measure cache hit performance
4. Test cache invalidation

**Expected Results**:
- Identical requests served from cache
- Cache hits respond in < 100ms
- Cache invalidation works correctly
- Cache storage efficient

---

## TC-SOLAR-008: Integration Tests

### TC-SOLAR-008-001: User Service Integration
**Priority**: High  
**Type**: Integration Test  

**Pre-condition**: User profile exists with solar preferences

**Steps**:
1. Request calculation for specific user
2. Verify user preferences loaded
3. Verify personalized recommendations
4. Test preference updates

**Expected Results**:
- User preferences integrated correctly
- Personalized calculations provided
- Preference changes reflected immediately
- Integration seamless and reliable

### TC-SOLAR-008-002: Location Service Integration
**Priority**: Medium  
**Type**: Integration Test  

**Steps**:
1. Request calculation with GPS coordinates
2. Verify location data retrieved
3. Test reverse geocoding
4. Handle location service errors

**Expected Results**:
- Location data integrated successfully
- GPS coordinates resolved to city/region
- Solar irradiance data retrieved
- Graceful error handling

### TC-SOLAR-008-003: Save Calculation Results
**Priority**: Medium  
**Type**: Integration Test  

**Steps**:
1. Complete solar calculation
2. Save results to user profile
3. Retrieve saved calculations
4. Update saved calculations

**Expected Results**:
- Calculation results saved correctly
- Results retrievable by user
- Update functionality works
- Data persistence reliable

---

## TC-SOLAR-009: Edge Cases and Error Handling

### TC-SOLAR-009-001: Minimal Roof Space Scenario
**Priority**: Medium  
**Type**: Edge Case Test  

**Test Data**:
```json
{
  "roofSize": 10,
  "electricityConsumption": 2000,
  "propertyType": "APARTMENT"
}
```

**Steps**:
1. Calculate with very limited roof space
2. Verify system recommendations
3. Check feasibility warnings
4. Provide alternative solutions

**Expected Results**:
- System sized to available space
- Feasibility warnings displayed
- Alternative solutions suggested
- Realistic expectations set

### TC-SOLAR-009-002: Extreme Electricity Consumption
**Priority**: Medium  
**Type**: Edge Case Test  

**Test Data**:
```json
{
  "electricityConsumption": 10000,
  "propertyType": "VILLA",
  "roofSize": 200
}
```

**Steps**:
1. Calculate for very high consumption
2. Verify system recommendations
3. Check multiple system options
4. Provide realistic expectations

**Expected Results**:
- Multiple system size options presented
- Partial offset scenarios calculated
- Commercial-scale options suggested
- Realistic ROI projections

### TC-SOLAR-009-003: Service Dependency Failures
**Priority**: High  
**Type**: Error Handling Test  

**Steps**:
1. Simulate location service failure
2. Simulate weather data unavailability
3. Verify fallback mechanisms
4. Test graceful degradation

**Expected Results**:
- Fallback data sources used
- Calculations continue with defaults
- User informed of limitations
- Service remains functional

---

## TC-SOLAR-010: Business Logic Accuracy

### TC-SOLAR-010-001: Solar Panel Technology Comparison
**Priority**: Medium  
**Type**: Business Logic Test  

**Panel Types**:
```json
[
  {"type": "monocrystalline", "efficiency": 0.20, "cost_per_watt": 2.5},
  {"type": "polycrystalline", "efficiency": 0.17, "cost_per_watt": 2.2},
  {"type": "thin_film", "efficiency": 0.12, "cost_per_watt": 1.8}
]
```

**Steps**:
1. Calculate system options with each panel type
2. Verify efficiency differences reflected
3. Compare cost-effectiveness
4. Provide technology recommendations

**Expected Results**:
- Efficiency differences calculated accurately
- Cost per kWh production compared
- Technology recommendations based on scenario
- Trade-offs clearly explained

### TC-SOLAR-010-002: Seasonal Performance Modeling
**Priority**: Medium  
**Type**: Business Logic Test  

**Steps**:
1. Calculate monthly energy production
2. Verify seasonal variations modeled
3. Account for dust accumulation periods
4. Include maintenance impact

**Expected Results**:
- Monthly production estimates accurate
- Summer peak production modeled
- Dust season impact included (spring in Saudi Arabia)
- Maintenance scheduling recommendations

---

## Test Data Requirements

### Standard Test Scenarios
```json
[
  {
    "name": "small_apartment",
    "propertyType": "APARTMENT",
    "roofSize": 30,
    "consumption": 600,
    "location": "Riyadh"
  },
  {
    "name": "medium_villa",
    "propertyType": "VILLA", 
    "roofSize": 200,
    "consumption": 2000,
    "location": "Jeddah"
  },
  {
    "name": "large_villa",
    "propertyType": "VILLA",
    "roofSize": 400, 
    "consumption": 4000,
    "location": "Dammam"
  }
]
```

### Solar Irradiance Data (Saudi Arabia)
```json
{
  "riyadh": {"annual": 6.2, "summer": 7.8, "winter": 4.6},
  "jeddah": {"annual": 6.8, "summer": 8.2, "winter": 5.4},
  "dammam": {"annual": 5.9, "summer": 7.3, "winter": 4.5},
  "tabuk": {"annual": 6.5, "summer": 8.1, "winter": 4.9},
  "abha": {"annual": 6.0, "summer": 7.0, "winter": 5.0}
}
```

### Equipment Database
```json
{
  "panels": [
    {"brand": "LONGi", "model": "LR4-72HIH-450M", "power": 450, "efficiency": 0.208},
    {"brand": "JinkoSolar", "model": "JKM400M-54HL4-V", "power": 400, "efficiency": 0.205},
    {"brand": "Canadian Solar", "model": "CS3W-400MS", "power": 400, "efficiency": 0.199}
  ],
  "inverters": [
    {"brand": "Huawei", "model": "SUN2000-10KTL-M1", "power": 10000, "efficiency": 0.98},
    {"brand": "SMA", "model": "STP 8000TL-20", "power": 8000, "efficiency": 0.97},
    {"brand": "Fronius", "model": "Symo 8.2-3-M", "power": 8200, "efficiency": 0.975}
  ]
}
```

### Test Environment Setup
- **Database**: solar_calculations_test
- **Location Services**: Mock GPS/weather data
- **Equipment Database**: Test equipment specifications
- **Financial Data**: Test tariff structures and financing options

---

**Total Test Cases**: 32
**High Priority**: 15
**Medium Priority**: 16
**Low Priority**: 1