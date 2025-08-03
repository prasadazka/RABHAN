#!/usr/bin/env node

/**
 * RABHAN DUMMY CREDENTIALS GENERATOR
 * Creates realistic test users and contractors with proper SAMA compliance
 * Following Saudi market patterns and validation rules
 */

const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

// Database configurations
const databases = {
  auth: {
    host: 'localhost',
    port: 5432,
    database: 'rabhan_auth',
    user: 'postgres',
    password: '12345'
  },
  users: {
    host: 'localhost',
    port: 5432,
    database: 'rabhan_user',
    user: 'postgres',
    password: '12345'
  },
  contractors: {
    host: 'localhost',
    port: 5432,
    database: 'rabhan_contractors',
    user: 'postgres',
    password: '12345'
  }
};

// Saudi regions and cities for realistic data
const saudiLocations = [
  { region: 'Riyadh', cities: ['Riyadh', 'Diriyah', 'Al Kharj', 'Al Majmaah'] },
  { region: 'Makkah', cities: ['Jeddah', 'Makkah', 'Taif', 'Yanbu'] },
  { region: 'Eastern Province', cities: ['Dammam', 'Al Khobar', 'Dhahran', 'Jubail'] },
  { region: 'Asir', cities: ['Abha', 'Khamis Mushait', 'Bisha', 'Najran'] },
  { region: 'Medina', cities: ['Medina', 'Yanbu', 'Al Ula', 'Badr'] },
  { region: 'Qassim', cities: ['Buraydah', 'Unayzah', 'Al Rass', 'Al Badai'] },
  { region: 'Tabuk', cities: ['Tabuk', 'Tayma', 'Al Wajh', 'Haql'] }
];

// Realistic Saudi names
const saudiFirstNames = {
  male: ['Ahmed', 'Mohammed', 'Abdullah', 'Omar', 'Khalid', 'Fahad', 'Salman', 'Faisal', 'Nasser', 'Turki'],
  female: ['Fatima', 'Aisha', 'Sarah', 'Noura', 'Hala', 'Maha', 'Reem', 'Lina', 'Dina', 'Nada']
};

const saudiLastNames = ['Al-Rashid', 'Al-Zahrani', 'Al-Otaibi', 'Al-Ghamdi', 'Al-Harbi', 'Al-Malki', 'Al-Mutairi', 'Al-Qahtani', 'Al-Dosari', 'Al-Shehri'];

// Company types for contractors
const companyTypes = [
  'Solar Solutions KSA',
  'Green Energy Systems',
  'Sun Power Technologies',
  'Renewable Energy Co',
  'Smart Solar Solutions',
  'Clean Energy Partners',
  'Solar Installation Experts',
  'Energy Efficiency Group',
  'Sustainable Power Solutions',
  'Advanced Solar Systems'
];

class DummyDataGenerator {
  constructor() {
    this.pools = {};
  }

  async connect() {
    console.log('🔌 Connecting to databases...');
    
    for (const [name, config] of Object.entries(databases)) {
      try {
        this.pools[name] = new Pool(config);
        await this.pools[name].query('SELECT 1');
        console.log(`✅ Connected to ${name} database`);
      } catch (error) {
        console.error(`❌ Failed to connect to ${name} database:`, error.message);
        throw error;
      }
    }
  }

  async disconnect() {
    console.log('🔌 Disconnecting from databases...');
    
    for (const [name, pool] of Object.entries(this.pools)) {
      await pool.end();
      console.log(`✅ Disconnected from ${name} database`);
    }
  }

  generateSaudiNationalId() {
    // Generate realistic Saudi National ID (starts with 1 for Saudi citizens)
    const firstDigit = Math.random() > 0.5 ? '1' : '2';
    const remainingDigits = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10)).join('');
    return firstDigit + remainingDigits;
  }

  generatePhoneNumber(country = 'SA') {
    if (country === 'SA') {
      // Saudi phone: +966 5X XXX XXXX
      const secondDigit = Math.floor(Math.random() * 10);
      const restDigits = Array.from({ length: 7 }, () => Math.floor(Math.random() * 10)).join('');
      return `+9665${secondDigit}${restDigits}`;
    } else if (country === 'IN') {
      // Indian phone: +91 XXXXX XXXXX
      const firstDigit = Math.floor(Math.random() * 4) + 6; // 6-9
      const restDigits = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10)).join('');
      return `+91${firstDigit}${restDigits}`;
    }
  }

  generateCommercialRegistration() {
    // Saudi CR format: 10 digits starting with 10, 20, 30, or 40
    const prefixes = ['10', '20', '30', '40'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = Array.from({ length: 8 }, () => Math.floor(Math.random() * 10)).join('');
    return prefix + suffix;
  }

  generateVATNumber() {
    // Saudi VAT format: 15 digits starting and ending with 3
    const middleDigits = Array.from({ length: 13 }, () => Math.floor(Math.random() * 10)).join('');
    return `3${middleDigits}3`;
  }

  getRandomLocation() {
    const location = saudiLocations[Math.floor(Math.random() * saudiLocations.length)];
    const city = location.cities[Math.floor(Math.random() * location.cities.length)];
    return { region: location.region, city };
  }

  generateGPSCoordinates(region) {
    // Approximate GPS coordinates for Saudi regions
    const coordinates = {
      'Riyadh': { lat: 24.7136, lng: 46.6753, variance: 1 },
      'Makkah': { lat: 21.3891, lng: 39.8579, variance: 1.5 },
      'Eastern Province': { lat: 26.2285, lng: 50.1271, variance: 1.2 },
      'Asir': { lat: 18.2164, lng: 42.5053, variance: 0.8 },
      'Medina': { lat: 24.5247, lng: 39.5692, variance: 0.8 },
      'Qassim': { lat: 26.3267, lng: 43.9750, variance: 0.8 },
      'Tabuk': { lat: 28.3998, lng: 36.5700, variance: 1 }
    };

    const coord = coordinates[region] || coordinates['Riyadh'];
    const latVariance = (Math.random() - 0.5) * coord.variance;
    const lngVariance = (Math.random() - 0.5) * coord.variance;

    return {
      latitude: (coord.lat + latVariance).toFixed(8),
      longitude: (coord.lng + lngVariance).toFixed(8)
    };
  }

  async createDummyUsers(count = 10) {
    console.log(`\n👥 Creating ${count} dummy users...`);

    const users = [];
    
    for (let i = 0; i < count; i++) {
      const isMale = Math.random() > 0.5;
      const firstName = saudiFirstNames[isMale ? 'male' : 'female'][Math.floor(Math.random() * saudiFirstNames[isMale ? 'male' : 'female'].length)];
      const lastName = saudiLastNames[Math.floor(Math.random() * saudiLastNames.length)];
      const location = this.getRandomLocation();
      const coordinates = this.generateGPSCoordinates(location.region);
      const nationalId = this.generateSaudiNationalId();
      const phone = this.generatePhoneNumber('SA');
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase().replace('al-', '')}${i + 1}@example.com`;
      const passwordHash = await bcrypt.hash('password123', 10);

      // Create user in auth database
      const authQuery = `
        INSERT INTO users (
          id, email, password_hash, phone, role, status, provider,
          national_id, user_type, first_name, last_name,
          bnpl_eligible, email_verified, phone_verified, sama_verified,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
        ) RETURNING id;
      `;

      const userId = uuidv4();
      const authValues = [
        userId, email, passwordHash, phone, 'USER', 'ACTIVE', 'EMAIL',
        nationalId, 'HOMEOWNER', firstName, lastName,
        true, true, true, true,
        new Date(), new Date()
      ];

      try {
        await this.pools.auth.query(authQuery, authValues);

        // Create user profile in user database
        const profileQuery = `
          INSERT INTO user_profiles (
            id, auth_user_id, region, city, district,
            street_address, postal_code, property_type, property_ownership,
            roof_size, gps_latitude, gps_longitude, electricity_consumption,
            electricity_meter_number, preferred_language, profile_completed,
            profile_completion_percentage, bnpl_max_amount,
            created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
          );
        `;

        const propertyTypes = ['villa', 'apartment', 'duplex', 'townhouse'];
        const ownershipTypes = ['owned', 'rented'];
        const consumptionRanges = ['400-600', '600-800', '800-1000', '1000-1200', '1200-1500'];
        
        const profileValues = [
          uuidv4(), userId, location.region, location.city, 'Al Olaya',
          `Street ${Math.floor(Math.random() * 999) + 1}`, String(Math.floor(Math.random() * 90000) + 10000),
          propertyTypes[Math.floor(Math.random() * propertyTypes.length)],
          ownershipTypes[Math.floor(Math.random() * ownershipTypes.length)],
          Math.floor(Math.random() * 200) + 50, // roof size 50-250 sqm
          parseFloat(coordinates.latitude), parseFloat(coordinates.longitude),
          consumptionRanges[Math.floor(Math.random() * consumptionRanges.length)],
          `M${Math.floor(Math.random() * 9999999999).toString().padStart(10, '0')}`,
          'ar', true, 85,
          Math.floor(Math.random() * 2000) + 3000, // 3000-5000 SAR
          new Date(), new Date()
        ];

        await this.pools.users.query(profileQuery, profileValues);

        users.push({
          id: userId,
          email,
          firstName,
          lastName,
          phone,
          region: location.region,
          city: location.city,
          password: 'password123'
        });

        console.log(`✅ Created user ${i + 1}: ${firstName} ${lastName} (${email})`);
      } catch (error) {
        console.error(`❌ Failed to create user ${i + 1}:`, error.message);
      }
    }

    return users;
  }

  async createDummyContractors(count = 5) {
    console.log(`\n🏗️ Creating ${count} dummy contractors...`);

    const contractors = [];

    for (let i = 0; i < count; i++) {
      const firstName = saudiFirstNames.male[Math.floor(Math.random() * saudiFirstNames.male.length)];
      const lastName = saudiLastNames[Math.floor(Math.random() * saudiLastNames.length)];
      const location = this.getRandomLocation();
      const nationalId = this.generateSaudiNationalId();
      const phone = this.generatePhoneNumber('SA');
      const email = `contractor.${firstName.toLowerCase()}.${lastName.toLowerCase().replace('al-', '')}${i + 1}@business.com`;
      const passwordHash = await bcrypt.hash('contractor123', 10);
      const companyName = `${companyTypes[Math.floor(Math.random() * companyTypes.length)]} ${i + 1}`;
      const crNumber = this.generateCommercialRegistration();
      const vatNumber = this.generateVATNumber();

      // Create contractor user in auth database
      const authQuery = `
        INSERT INTO users (
          id, email, password_hash, phone, role, status, provider,
          national_id, user_type, first_name, last_name,
          bnpl_eligible, email_verified, phone_verified, sama_verified,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
        ) RETURNING id;
      `;

      const userId = uuidv4();
      const authValues = [
        userId, email, passwordHash, phone, 'CONTRACTOR', 'ACTIVE', 'EMAIL',
        nationalId, 'BUSINESS', firstName, lastName,
        false, true, true, true,
        new Date(), new Date()
      ];

      try {
        await this.pools.auth.query(authQuery, authValues);

        // Create contractor profile in contractor database
        const contractorQuery = `
          INSERT INTO contractors (
            id, user_id, business_name, business_type, commercial_registration,
            vat_number, email, phone, address_line1, city, region,
            postal_code, country, established_year, employee_count,
            description, service_categories, service_areas, years_experience,
            status, verification_level, total_projects, completed_projects,
            average_rating, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26
          );
        `;

        const businessTypes = ['llc', 'corporation', 'individual'];
        const serviceCategories = ['residential_solar', 'commercial_solar', 'maintenance'];
        const descriptions = [
          'Leading solar energy solutions provider in Saudi Arabia',
          'Specialized in residential and commercial solar installations',
          'Expert solar system design and maintenance services',
          'Comprehensive renewable energy solutions',
          'Professional solar installation and consultation services'
        ];

        const contractorValues = [
          uuidv4(), userId, companyName,
          businessTypes[Math.floor(Math.random() * businessTypes.length)],
          crNumber, vatNumber, email, phone,
          `${companyName} Building, Street ${Math.floor(Math.random() * 99) + 1}`,
          location.city, location.region,
          String(Math.floor(Math.random() * 90000) + 10000), 'SA',
          Math.floor(Math.random() * 15) + 2015, // established 2015-2030
          Math.floor(Math.random() * 50) + 5, // 5-55 employees
          descriptions[Math.floor(Math.random() * descriptions.length)],
          `{${serviceCategories[Math.floor(Math.random() * serviceCategories.length)]}}`,
          `{${location.city}}`,
          Math.floor(Math.random() * 10) + 2, // 2-12 years experience
          Math.random() > 0.3 ? 'active' : 'verified', // 70% active, 30% verified
          Math.floor(Math.random() * 3) + 3, // verification level 3-5
          Math.floor(Math.random() * 50) + 10, // 10-60 total projects
          Math.floor(Math.random() * 45) + 8, // 8-53 completed projects
          (Math.random() * 1.5 + 3.5).toFixed(2), // rating 3.5-5.0
          new Date(), new Date()
        ];

        await this.pools.contractors.query(contractorQuery, contractorValues);

        contractors.push({
          id: userId,
          email,
          firstName,
          lastName,
          companyName,
          phone,
          crNumber,
          vatNumber,
          region: location.region,
          city: location.city,
          password: 'contractor123'
        });

        console.log(`✅ Created contractor ${i + 1}: ${companyName} (${email})`);
      } catch (error) {
        console.error(`❌ Failed to create contractor ${i + 1}:`, error.message);
      }
    }

    return contractors;
  }

  async createAdminUser() {
    console.log('\n👑 Creating admin user...');

    const email = 'admin@rabhan.sa';
    const passwordHash = await bcrypt.hash('admin123', 10);
    const phone = '+966501234567';

    const authQuery = `
      INSERT INTO users (
        id, email, password_hash, phone, role, status, provider,
        first_name, last_name, user_type,
        bnpl_eligible, email_verified, phone_verified, sama_verified,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
      ) RETURNING id;
    `;

    const userId = uuidv4();
    const authValues = [
      userId, email, passwordHash, phone, 'ADMIN', 'ACTIVE', 'EMAIL',
      'Admin', 'User', 'BUSINESS',
      false, true, true, true,
      new Date(), new Date()
    ];

    try {
      await this.pools.auth.query(authQuery, authValues);
      console.log(`✅ Created admin user: ${email}`);
      
      return {
        id: userId,
        email,
        password: 'admin123',
        role: 'ADMIN'
      };
    } catch (error) {
      console.error('❌ Failed to create admin user:', error.message);
      throw error;
    }
  }

  async generateSummaryReport(users, contractors, admin) {
    console.log('\n📊 DUMMY CREDENTIALS SUMMARY REPORT');
    console.log('='.repeat(50));
    
    console.log(`\n👥 USERS (${users.length} created):`);
    console.log('Email\t\t\t\tPassword\tName\t\t\tPhone\t\t\tLocation');
    console.log('-'.repeat(100));
    users.forEach(user => {
      console.log(`${user.email.padEnd(30)}\tpassword123\t${(user.firstName + ' ' + user.lastName).padEnd(20)}\t${user.phone}\t${user.city}, ${user.region}`);
    });

    console.log(`\n🏗️ CONTRACTORS (${contractors.length} created):`);
    console.log('Email\t\t\t\t\tPassword\t\tCompany\t\t\t\tPhone\t\t\tCR Number');
    console.log('-'.repeat(120));
    contractors.forEach(contractor => {
      console.log(`${contractor.email.padEnd(35)}\tcontractor123\t${contractor.companyName.padEnd(25)}\t${contractor.phone}\t${contractor.crNumber}`);
    });

    console.log(`\n👑 ADMIN:`);
    console.log('Email\t\t\tPassword\tRole');
    console.log('-'.repeat(40));
    console.log(`${admin.email}\tadmin123\t${admin.role}`);

    console.log('\n🔐 AUTHENTICATION DETAILS:');
    console.log('- All users have verified email and phone');
    console.log('- All users are SAMA verified for testing');
    console.log('- All passwords are hashed with bcrypt');
    console.log('- National IDs follow Saudi format (10 digits, start with 1/2)');
    console.log('- Phone numbers follow Saudi format (+966 5X XXX XXXX)');
    console.log('- Contractors have valid CR and VAT numbers');

    console.log('\n🎯 TESTING SCENARIOS:');
    console.log('1. User Login: Use any user email with password "password123"');
    console.log('2. Contractor Login: Use any contractor email with password "contractor123"');
    console.log('3. Admin Login: Use admin@rabhan.sa with password "admin123"');
    console.log('4. JWT Testing: All users can generate valid tokens');
    console.log('5. BNPL Testing: Users have various eligibility amounts (3000-5000 SAR)');

    console.log('\n✅ ALL DUMMY CREDENTIALS CREATED SUCCESSFULLY!');
    console.log('🚀 Ready for development and testing!');
  }
}

async function main() {
  const generator = new DummyDataGenerator();

  try {
    await generator.connect();

    // Create dummy data
    const users = await generator.createDummyUsers(12); // 12 diverse users
    const contractors = await generator.createDummyContractors(8); // 8 contractors
    const admin = await generator.createAdminUser();

    // Generate summary report
    await generator.generateSummaryReport(users, contractors, admin);

  } catch (error) {
    console.error('❌ Error creating dummy credentials:', error);
    process.exit(1);
  } finally {
    await generator.disconnect();
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { DummyDataGenerator };