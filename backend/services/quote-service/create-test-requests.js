const { Pool } = require('pg');

async function createTestRequests() {
  try {
    console.log('🔧 Creating test quote requests...');
    
    const pool = new Pool({
      host: 'localhost',
      port: 5432,
      database: 'quote_service_db',
      user: 'postgres',
      password: '12345',
    });
    
    // Test user ID (can be any UUID)
    const testUserId = '550e8400-e29b-41d4-a716-446655440000';
    
    const testRequests = [
      {
        system_size_kwp: 5.5,
        location_address: 'King Abdulaziz Road, Al Malqa District, Riyadh',
        service_area: 'Riyadh',
        property_details: {
          property_type: 'residential',
          roof_type: 'flat',
          building_floors: 2,
          approximate_roof_area: 200
        },
        electricity_consumption: {
          monthly_average: 1200,
          peak_month: 1800,
          min_month: 800
        }
      },
      {
        system_size_kwp: 8.0,
        location_address: 'Prince Turki Al Awwal Road, Al Nakheel District, Riyadh',
        service_area: 'Riyadh',
        property_details: {
          property_type: 'commercial',
          roof_type: 'flat',
          building_floors: 3,
          approximate_roof_area: 400
        },
        electricity_consumption: {
          monthly_average: 2500,
          peak_month: 3500,
          min_month: 1800
        }
      }
    ];
    
    for (let i = 0; i < testRequests.length; i++) {
      const request = testRequests[i];
      
      const result = await pool.query(`
        INSERT INTO quote_requests (
          user_id, 
          system_size_kwp, 
          location_address, 
          service_area, 
          property_details, 
          electricity_consumption,
          status,
          max_contractors,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', 3, NOW(), NOW())
        RETURNING id
      `, [
        testUserId,
        request.system_size_kwp,
        request.location_address,
        request.service_area,
        JSON.stringify(request.property_details),
        JSON.stringify(request.electricity_consumption)
      ]);
      
      console.log(`✅ Created request ${i + 1}: ${result.rows[0].id} (${request.system_size_kwp} kWp in ${request.service_area})`);
    }
    
    console.log(`\n🎉 Created ${testRequests.length} test quote requests`);
    
    await pool.end();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

createTestRequests();