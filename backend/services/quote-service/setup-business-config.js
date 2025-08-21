const { database } = require('./dist/config/database.config.js');

async function setupBusinessConfig() {
  try {
    console.log('Checking business config...');
    
    const configResult = await database.query('SELECT * FROM business_config');
    console.log('Current business config rows:', configResult.rows.length);
    
    if (configResult.rows.length > 0) {
      configResult.rows.forEach(row => {
        console.log('Config:', row.config_key, '=', row.config_value);
      });
    }
    
    console.log('Inserting/updating default configurations...');
    
    const defaultConfigs = [
      {
        key: 'pricing_rules',
        value: {
          max_price_per_kwp: 2000,
          min_system_size_kwp: 1,
          max_system_size_kwp: 1000,
          overprice_percent: 10,
          commission_percent: 15,
          vat_rate: 15
        }
      },
      {
        key: 'quote_rules',
        value: {
          max_contractors_per_request: 3,
          quote_validity_days: 30,
          min_inspection_notice_hours: 24
        }
      }
    ];
    
    for (const config of defaultConfigs) {
      const query = `
        INSERT INTO business_config (config_key, config_value, description, is_active)
        VALUES ($1, $2, $3, true)
        ON CONFLICT (config_key) DO UPDATE SET
          config_value = $2,
          updated_at = CURRENT_TIMESTAMP
      `;
      
      await database.query(query, [
        config.key,
        JSON.stringify(config.value),
        'System generated default configuration'
      ]);
      
      console.log('Inserted/updated config:', config.key);
    }
    
    console.log('Business configurations setup completed successfully');
    
  } catch (error) {
    console.error('Business config setup error:', error.message);
  } finally {
    process.exit(0);
  }
}

setupBusinessConfig();