const { database } = require('./dist/config/database.config.js');

async function updatePricingConfig() {
  try {
    const updatedConfig = {
      max_price_per_kwp: 2000,
      min_system_size_kwp: 1,
      max_system_size_kwp: 1000,
      platform_overprice_percent: 10,
      platform_commission_percent: 15,
      vat_rate: 15
    };
    
    await database.query(
      'UPDATE business_config SET config_value = $1, updated_at = CURRENT_TIMESTAMP WHERE config_key = $2',
      [JSON.stringify(updatedConfig), 'pricing_rules']
    );
    
    console.log('Updated pricing_rules configuration with min_system_size_kwp');
    
    // Verify the update
    const result = await database.query('SELECT config_value FROM business_config WHERE config_key = $1', ['pricing_rules']);
    console.log('Updated pricing config:', result.rows[0].config_value);
    
  } catch (error) {
    console.error('Update error:', error.message);
  } finally {
    process.exit(0);
  }
}

updatePricingConfig();