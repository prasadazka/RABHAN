const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = 3009;

// Database connection
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'quote_service_db',
  user: 'postgres',
  password: '12345',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3010'],
  credentials: true
}));
app.use(express.json());

// Add cache-busting headers for contractor endpoints
app.use('/api/quotes/contractor', (req, res, next) => {
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  next();
});

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Quote Service is running (production)',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// ============================================
// USER ENDPOINTS
// ============================================

// Get available contractors for user selection
app.get('/api/quotes/available-contractors', async (req, res) => {
  try {
    const { 
      region, 
      city, 
      min_rating = 0, 
      verification_level = 0,
      limit = 20,
      sort_by = 'average_rating',
      sort_order = 'desc',
      max_distance_km = 50
    } = req.query;
    
    console.log(`📋 User requesting available contractors for region: ${region}`);
    
    // Build query to get contractors from contractor service database
    // For now, show all contractors without filters (filters will be added later)
    // Including pending status to show Azkashine and other contractors
    let whereConditions = ["status IN ('active', 'verified', 'pending')", "deleted_at IS NULL"];
    let queryParams = [];
    let paramIndex = 1;
    
    const whereClause = whereConditions.join(' AND ');
    
    // Valid sort columns
    const validSortColumns = ['business_name', 'average_rating', 'created_at', 'years_experience'];
    const sortColumn = validSortColumns.includes(sort_by) ? sort_by : 'average_rating';
    const sortDirection = sort_order === 'asc' ? 'ASC' : 'DESC';
    
    const contractorsQuery = `
      SELECT 
        id,
        user_id,
        business_name,
        business_type,
        email,
        phone,
        region,
        city,
        service_areas,
        service_categories,
        years_experience,
        contractor_type,
        average_rating,
        total_reviews,
        completed_projects,
        verification_level,
        status,
        description,
        created_at
      FROM contractors
      WHERE ${whereClause}
      ORDER BY ${sortColumn} ${sortDirection}
      LIMIT $${paramIndex}
    `;
    
    queryParams.push(parseInt(limit));
    
    // Note: We're connecting to contractor service database to get contractors
    // This should ideally be done through service-to-service call in production
    const { Pool: ContractorPool } = require('pg');
    const contractorPool = new ContractorPool({
      host: 'localhost',
      port: 5432,
      database: 'rabhan_contractors',
      user: 'postgres',
      password: '12345',
    });
    
    const result = await contractorPool.query(contractorsQuery, queryParams);
    await contractorPool.end();
    
    res.json({
      success: true,
      message: 'Available contractors retrieved successfully',
      data: {
        contractors: result.rows.map(contractor => ({
          ...contractor,
          // Ensure arrays are properly formatted
          service_areas: Array.isArray(contractor.service_areas) ? contractor.service_areas : [],
          service_categories: Array.isArray(contractor.service_categories) ? contractor.service_categories : [],
          // Format ratings
          average_rating: parseFloat(contractor.average_rating) || 0,
          total_reviews: parseInt(contractor.total_reviews) || 0,
          completed_projects: parseInt(contractor.completed_projects) || 0,
          years_experience: parseInt(contractor.years_experience) || 0,
          verification_level: parseInt(contractor.verification_level) || 0
        })),
        total: result.rows.length,
        filters: {
          note: "Filters temporarily disabled - showing all contractors",
          applied: false,
          limit
        }
      }
    });

  } catch (error) {
    console.error('Error in available-contractors endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available contractors',
      error: error.message
    });
  }
});

// Get user's quote requests
app.get('/api/quotes/my-requests', async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const userId = req.headers['x-user-id'] || '123e4567-e89b-12d3-a456-426614174000'; // Mock for now
    
    console.log(`📋 User ${userId} requesting quote requests (page ${page}, limit ${limit})`);
    
    let whereClause = 'WHERE qr.user_id = $1';
    const params = [userId];
    
    if (status) {
      whereClause += ' AND qr.status = $2';
      params.push(status);
    }
    
    // Get total count
    const countQuery = `SELECT COUNT(*) FROM quote_requests qr ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);
    
    // Get paginated results with quote counts
    const offset = (page - 1) * limit;
    const dataQuery = `
      SELECT qr.*, 
             COUNT(cq.id) as quotes_received,
             COUNT(CASE WHEN cqa.status IN ('assigned', 'viewed') THEN 1 END) as quotes_pending
      FROM quote_requests qr
      LEFT JOIN contractor_quotes cq ON qr.id = cq.request_id
      LEFT JOIN contractor_quote_assignments cqa ON qr.id = cqa.request_id AND cqa.status IN ('assigned', 'viewed')
      ${whereClause}
      GROUP BY qr.id
      ORDER BY qr.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    
    params.push(limit, offset);
    const dataResult = await pool.query(dataQuery, params);
    
    // Transform the data to match frontend expectations
    const transformedRequests = dataResult.rows.map(row => {
      // Extract preferred_installation_date from property_details if it exists
      const propertyDetails = row.property_details || {};
      const preferredDate = propertyDetails.preferred_installation_date || null;
      
      return {
        ...row,
        preferred_installation_date: preferredDate,
        contact_phone: propertyDetails.contact_phone || row.user_phone || '',
        quotes_count: parseInt(row.quotes_received) || 0,
        // Ensure numeric values are properly formatted
        system_size_kwp: parseFloat(row.system_size_kwp),
        quotes_received: parseInt(row.quotes_received) || 0,
        quotes_pending: parseInt(row.quotes_pending) || 0
      };
    });

    res.json({
      success: true,
      message: 'User quote requests retrieved successfully',
      data: {
        requests: transformedRequests,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: offset + parseInt(limit) < total,
          hasPrev: parseInt(page) > 1
        }
      }
    });

  } catch (error) {
    console.error('Error in my-requests endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user quote requests',
      error: error.message
    });
  }
});

// Get quotes for a specific request
app.get('/api/quotes/request/:request_id/quotes', async (req, res) => {
  try {
    // Add cache-busting headers
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    const { request_id } = req.params;
    console.log(`📋 User requesting quotes for request ${request_id}`);
    
    const quotesQuery = `
      SELECT cq.*,
             (cq.installation_timeline_days || ' days') as installation_timeline,
             COALESCE((cq.system_specs->>'warranty_years')::integer, 20) as warranty_years
      FROM contractor_quotes cq
      WHERE cq.request_id = $1 AND cq.admin_status = 'approved'
      ORDER BY cq.base_price ASC
    `;
    
    const result = await pool.query(quotesQuery, [request_id]);
    
    // Fetch line items for each quote
    for (const quote of result.rows) {
      try {
        const lineItemsQuery = `
          SELECT * FROM quotation_line_items 
          WHERE quotation_id = $1 
          ORDER BY id
        `;
        const lineItemsResult = await pool.query(lineItemsQuery, [quote.id]);
        quote.line_items = lineItemsResult.rows;
      } catch (error) {
        console.log('Error fetching line items for quote', quote.id, ':', error.message);
        quote.line_items = [];
      }
    }
    
    // Get contractor details for each quote
    const quotesWithContractors = await Promise.all(
      result.rows.map(async (row) => {
        const contractorDetails = await getContractorDetails(row.contractor_id);
        return {
          ...row,
          contractor_company: contractorDetails.business_name,
          contractor_email: contractorDetails.email,
          contractor_phone: contractorDetails.phone,
          total_price: parseFloat(row.base_price) * 1.1, // Add 10% overprice
          price_per_kwp: parseFloat(row.price_per_kwp),
          status: 'submitted'
        };
      })
    );
    
    res.json({
      success: true,
      message: 'Quotes for request retrieved successfully',
      data: {
        quotes: quotesWithContractors,
        total: quotesWithContractors.length
      }
    });

  } catch (error) {
    console.error('Error in request quotes endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch quotes for request',
      error: error.message
    });
  }
});

// Create new quote request
app.post('/api/quotes/request', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || '123e4567-e89b-12d3-a456-426614174000';
    console.log(`📋 User ${userId} creating new quote request`);
    
    const requestData = req.body;
    console.log('📋 Request data received:', JSON.stringify(requestData, null, 2));
    
    // Ensure preferred_installation_date is included in property_details
    const propertyDetails = requestData.property_details || {};
    if (requestData.preferred_installation_date) {
      propertyDetails.preferred_installation_date = requestData.preferred_installation_date;
    }
    
    // Include contact_phone in property_details if provided
    if (requestData.contact_phone) {
      propertyDetails.contact_phone = requestData.contact_phone;
    }
    
    const insertQuery = `
      INSERT INTO quote_requests (
        user_id, system_size_kwp, location_address, service_area, 
        property_details, electricity_consumption, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const values = [
      userId,
      requestData.system_size_kwp,
      requestData.location_address,
      requestData.service_area,
      JSON.stringify(propertyDetails),
      JSON.stringify(requestData.electricity_consumption || {}),
      'pending'
    ];
    
    const result = await pool.query(insertQuery, values);
    
    res.json({
      success: true,
      message: 'Quote request created successfully',
      data: {
        request: result.rows[0]
      }
    });

  } catch (error) {
    console.error('Error creating quote request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create quote request',
      error: error.message
    });
  }
});

// ============================================
// ADMIN ENDPOINTS
// ============================================

// Get all quote requests for admin dashboard
app.get('/api/admin/quotes', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    
    console.log(`📋 Admin requesting quotes (page ${page}, limit ${limit}, status: ${status}, search: ${search})`);
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;
    
    // Filter by status if provided
    if (status) {
      whereClause += ` AND qr.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    // Search functionality
    if (search) {
      whereClause += ` AND (qr.location_address ILIKE $${paramIndex} OR qr.service_area ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    // Get total count
    const countQuery = `SELECT COUNT(*) FROM quote_requests qr ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);
    
    // Get paginated results with contractor assignments and quote counts
    const offset = (page - 1) * limit;
    const dataQuery = `
      SELECT qr.*, 
             COUNT(DISTINCT cqa.contractor_id) as assigned_contractors_count,
             COUNT(DISTINCT cq.id) as received_quotes_count,
             COUNT(DISTINCT CASE WHEN cq.admin_status = 'approved' THEN cq.id END) as approved_quotes_count
      FROM quote_requests qr
      LEFT JOIN contractor_quote_assignments cqa ON qr.id = cqa.request_id
      LEFT JOIN contractor_quotes cq ON qr.id = cq.request_id
      ${whereClause}
      GROUP BY qr.id
      ORDER BY qr.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    params.push(limit, offset);
    const dataResult = await pool.query(dataQuery, params);
    
    // Transform the data to include proper counts and extract preferred date
    const transformedRequests = await Promise.all(
      dataResult.rows.map(async (row) => {
        const propertyDetails = row.property_details || {};
        const preferredDate = propertyDetails.preferred_installation_date || null;
        
        // Get user details for each quote request
        const userDetails = await getUserDetails(row.user_id);
        
        return {
          ...row,
          preferred_installation_date: preferredDate,
          assigned_contractors_count: parseInt(row.assigned_contractors_count) || 0,
          received_quotes_count: parseInt(row.received_quotes_count) || 0,
          approved_quotes_count: parseInt(row.approved_quotes_count) || 0,
          system_size_kwp: parseFloat(row.system_size_kwp),
          selected_contractors: Array.isArray(row.selected_contractors) ? row.selected_contractors : [],
          // Add user details that frontend expects
          user_first_name: userDetails.first_name,
          user_last_name: userDetails.last_name,
          user_email: userDetails.email,
          user_phone: userDetails.phone || propertyDetails.contact_phone || ''
        };
      })
    );

    res.json({
      success: true,
      message: 'Quote requests retrieved successfully',
      data: {
        quotes: transformedRequests,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: offset + parseInt(limit) < total,
          hasPrev: parseInt(page) > 1
        }
      }
    });

  } catch (error) {
    console.error('Error in admin quotes endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch quote requests',
      error: error.message
    });
  }
});

// Get specific quote request details for admin
app.get('/api/admin/quotes/:quoteId', async (req, res) => {
  try {
    const { quoteId } = req.params;
    console.log(`📋 Admin requesting details for quote ${quoteId}`);
    
    const quoteQuery = `
      SELECT qr.*,
             COUNT(DISTINCT cqa.contractor_id) as assigned_contractors_count,
             COUNT(DISTINCT cq.id) as received_quotes_count,
             COUNT(DISTINCT CASE WHEN cq.admin_status = 'approved' THEN cq.id END) as approved_quotes_count
      FROM quote_requests qr
      LEFT JOIN contractor_quote_assignments cqa ON qr.id = cqa.request_id
      LEFT JOIN contractor_quotes cq ON qr.id = cq.request_id
      WHERE qr.id = $1
      GROUP BY qr.id
    `;
    
    const result = await pool.query(quoteQuery, [quoteId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Quote request not found'
      });
    }
    
    const quote = result.rows[0];
    const propertyDetails = quote.property_details || {};
    const preferredDate = propertyDetails.preferred_installation_date || null;
    
    const transformedQuote = {
      ...quote,
      preferred_installation_date: preferredDate,
      assigned_contractors_count: parseInt(quote.assigned_contractors_count) || 0,
      received_quotes_count: parseInt(quote.received_quotes_count) || 0,
      approved_quotes_count: parseInt(quote.approved_quotes_count) || 0,
      system_size_kwp: parseFloat(quote.system_size_kwp),
      selected_contractors: Array.isArray(quote.selected_contractors) ? quote.selected_contractors : []
    };

    res.json({
      success: true,
      message: 'Quote details retrieved successfully',
      data: { quote: transformedQuote }
    });

  } catch (error) {
    console.error('Error in admin quote details endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch quote details',
      error: error.message
    });
  }
});

// Get contractor assignments for a quote
app.get('/api/admin/quotes/:quoteId/assignments', async (req, res) => {
  try {
    const { quoteId } = req.params;
    console.log(`📋 Admin requesting assignments for quote ${quoteId}`);
    
    const assignmentsQuery = `
      SELECT cqa.*, 
             cq.base_price, cq.admin_status as quote_status, cq.created_at as quote_submitted_at
      FROM contractor_quote_assignments cqa
      LEFT JOIN contractor_quotes cq ON cqa.request_id = cq.request_id AND cqa.contractor_id = cq.contractor_id
      WHERE cqa.request_id = $1
      ORDER BY cqa.assigned_at DESC
    `;
    
    const result = await pool.query(assignmentsQuery, [quoteId]);

    // Get contractor details for each assignment
    const assignmentsWithContractors = await Promise.all(
      result.rows.map(async (row) => {
        const contractorDetails = await getContractorDetails(row.contractor_id);
        return {
          ...row,
          contractor_name: contractorDetails.business_name,
          contractor_email: contractorDetails.email,
          contractor_phone: contractorDetails.phone,
          base_price: row.base_price ? parseFloat(row.base_price) : null,
          total_price: row.total_price ? parseFloat(row.total_price) : null,
          has_submitted_quote: !!row.quote_submitted_at
        };
      })
    );

    res.json({
      success: true,
      message: 'Quote assignments retrieved successfully',
      data: {
        assignments: assignmentsWithContractors
      }
    });

  } catch (error) {
    console.error('Error in admin quote assignments endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch quote assignments',
      error: error.message
    });
  }
});

// Update quote status (admin only)
app.put('/api/admin/quotes/:quoteId/status', async (req, res) => {
  try {
    const { quoteId } = req.params;
    const { status, adminNotes } = req.body;
    
    console.log(`📋 Admin updating quote ${quoteId} status to ${status}`);
    
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }
    
    const validStatuses = ['pending', 'in_review', 'approved', 'rejected', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }
    
    const updateQuery = `
      UPDATE quote_requests 
      SET status = $1, 
          updated_at = NOW(),
          admin_notes = COALESCE(admin_notes, '') || CASE WHEN admin_notes IS NULL OR admin_notes = '' THEN $2 ELSE E'\n---\n' || $2 END
      WHERE id = $3
      RETURNING *
    `;
    
    const result = await pool.query(updateQuery, [status, adminNotes || `Status updated to ${status} by admin`, quoteId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Quote request not found'
      });
    }

    res.json({
      success: true,
      message: `Quote status updated to ${status} successfully`,
      data: { quote: result.rows[0] }
    });

  } catch (error) {
    console.error('Error in admin update quote status endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update quote status',
      error: error.message
    });
  }
});

// Get contractor quotes for a specific request (admin only)
app.get('/api/admin/quotes/:quoteId/contractor-quotes', async (req, res) => {
  try {
    const { quoteId } = req.params;
    console.log(`📋 Admin requesting contractor quotes for quote ${quoteId}`);
    
    const quotesQuery = `
      SELECT cq.*
      FROM contractor_quotes cq
      WHERE cq.request_id = $1
      ORDER BY cq.created_at DESC
    `;
    
    const result = await pool.query(quotesQuery, [quoteId]);
    
    // Get contractor details for each quote
    const quotesWithContractors = await Promise.all(
      result.rows.map(async (row) => {
        const contractorDetails = await getContractorDetails(row.contractor_id);
        return {
          ...row,
          contractor_name: contractorDetails.business_name,
          contractor_email: contractorDetails.email,
          contractor_phone: contractorDetails.phone,
          base_price: parseFloat(row.base_price),
          total_price: parseFloat(row.total_price) || parseFloat(row.base_price),
          price_per_kwp: parseFloat(row.price_per_kwp),
          installation_timeline_days: parseInt(row.installation_timeline_days) || 30
        };
      })
    );
    
    res.json({
      success: true,
      message: 'Contractor quotes retrieved successfully',
      data: {
        contractor_quotes: quotesWithContractors
      }
    });

  } catch (error) {
    console.error('Error in admin contractor quotes endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contractor quotes',
      error: error.message
    });
  }
});

// Approve/Reject contractor quote (admin only)
app.put('/api/admin/contractor-quotes/:contractorQuoteId/status', async (req, res) => {
  try {
    const { contractorQuoteId } = req.params;
    const { admin_status, admin_notes } = req.body;
    
    console.log(`📋 Admin updating contractor quote ${contractorQuoteId} status to ${admin_status}`);
    
    if (!admin_status) {
      return res.status(400).json({
        success: false,
        message: 'Admin status is required'
      });
    }
    
    const validStatuses = ['pending', 'approved', 'rejected'];
    if (!validStatuses.includes(admin_status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }
    
    const updateQuery = `
      UPDATE contractor_quotes 
      SET admin_status = $1, 
          admin_reviewed_at = NOW(),
          admin_notes = $2,
          updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `;
    
    const result = await pool.query(updateQuery, [admin_status, admin_notes || `Quote ${admin_status} by admin`, contractorQuoteId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Contractor quote not found'
      });
    }

    res.json({
      success: true,
      message: `Contractor quote ${admin_status} successfully`,
      data: { contractor_quote: result.rows[0] }
    });

  } catch (error) {
    console.error('Error in admin approve/reject contractor quote endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update contractor quote status',
      error: error.message
    });
  }
});

// ============================================
// CONTRACTOR ENDPOINTS
// ============================================

// Helper function to get contractor_id from user_id (or return if already contractor_id)
async function getContractorIdFromUserId(userId) {
  try {
    const { Pool: ContractorPool } = require('pg');
    const contractorPool = new ContractorPool({
      host: 'localhost',
      port: 5432,
      database: 'rabhan_contractors',
      user: 'postgres',
      password: '12345',
    });
    
    // First check if this ID is already a contractor ID
    const directResult = await contractorPool.query(
      'SELECT id FROM contractors WHERE id = $1 AND deleted_at IS NULL',
      [userId]
    );
    
    if (directResult.rows.length > 0) {
      await contractorPool.end();
      return userId; // It's already a contractor ID
    }
    
    // If not, try to map from user_id
    const mappingResult = await contractorPool.query(
      'SELECT id FROM contractors WHERE user_id = $1 AND deleted_at IS NULL',
      [userId]
    );
    
    await contractorPool.end();
    
    if (mappingResult.rows.length > 0) {
      return mappingResult.rows[0].id;
    }
    return null;
  } catch (error) {
    console.error('Error mapping user_id to contractor_id:', error);
    return null;
  }
}

// Helper function to get contractor details from auth service and contractor service
async function getContractorDetails(contractorId) {
  try {
    // First try to get basic contractor info from auth service database (contractors table)
    let contractorName = 'Unknown Contractor';
    let email = 'unknown@contractor.com';
    let phone = null;
    let companyName = null;
    
    // Try to connect to auth database to get basic contractor info
    try {
      const { Pool: AuthPool } = require('pg');
      const authPool = new AuthPool({
        host: 'localhost',
        port: 5432,
        database: 'rabhan_auth', // Auth service database
        user: 'postgres',
        password: '12345',
        max: 5,
        idleTimeoutMillis: 5000,
        connectionTimeoutMillis: 3000,
      });
      
      const authResult = await authPool.query(
        'SELECT first_name, last_name, email, phone, company_name FROM contractors WHERE id = $1',
        [contractorId]
      );
      
      if (authResult.rows.length > 0) {
        const contractor = authResult.rows[0];
        contractorName = `${contractor.first_name || ''} ${contractor.last_name || ''}`.trim() || 'Contractor';
        email = contractor.email || `contractor${contractorId.substring(0, 8)}@rabhan.sa`;
        phone = contractor.phone || null;
        companyName = contractor.company_name || null;
      }
      await authPool.end();
    } catch (authDbError) {
      console.log('Auth database query for contractor failed:', authDbError.message);
    }
    
    // Try contractor service API for additional business info
    try {
      const axios = require('axios');
      const contractorProfileResponse = await axios.get(`http://localhost:3004/api/contractors/${contractorId}`, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-mock-token'
        }
      });
      
      if (contractorProfileResponse.data && contractorProfileResponse.data.success && contractorProfileResponse.data.data) {
        const profile = contractorProfileResponse.data.data;
        
        // Use business name from contractor service if available
        if (profile.business_name || profile.company_name) {
          companyName = profile.business_name || profile.company_name;
        }
        
        // If we didn't get email from auth service, use contractor service email
        if (email === 'unknown@contractor.com' && profile.email) {
          email = profile.email;
        }
        
        // If we didn't get phone from auth service, use contractor service phone
        if (!phone && profile.phone) {
          phone = profile.phone;
        }
      }
    } catch (contractorServiceError) {
      console.log('Contractor service API failed:', contractorServiceError.message);
    }
    
    return {
      id: contractorId,
      business_name: companyName || contractorName,
      email: email,
      phone: phone
    };
  } catch (error) {
    console.error('Error fetching contractor details:', error);
    return {
      id: contractorId,
      business_name: 'Unknown Contractor',
      email: 'unknown@contractor.com',
      phone: null
    };
  }
}

// Helper function to get user details from both auth and user services
async function getUserDetails(userId) {
  try {
    // First try to get basic user info (first_name, last_name, email) from auth service database
    let firstName = 'User';
    let lastName = 'Profile';
    let email = `user${userId.substring(0, 8)}@rabhan.sa`;
    let phone = null;
    
    // Try to connect directly to auth database to get actual first_name and last_name
    try {
      const { Pool: AuthPool } = require('pg');
      const authPool = new AuthPool({
        host: 'localhost',
        port: 5432,
        database: 'rabhan_auth', // Default auth database name
        user: 'postgres',
        password: '12345', // Same as quote service
        max: 5,
        idleTimeoutMillis: 5000,
        connectionTimeoutMillis: 3000,
      });
      
      const authResult = await authPool.query(
        'SELECT first_name, last_name, email, phone FROM users WHERE id = $1',
        [userId]
      );
      
      if (authResult.rows.length > 0) {
        const authUser = authResult.rows[0];
        firstName = authUser.first_name || 'User';
        lastName = authUser.last_name || 'User';
        email = authUser.email || `user${userId.substring(0, 8)}@rabhan.sa`;
        phone = authUser.phone || null;
        
        await authPool.end();
        
        return {
          id: userId,
          first_name: firstName,
          last_name: lastName,
          email: email,
          phone: phone
        };
      }
      await authPool.end();
    } catch (authDbError) {
      console.log('Auth database query failed:', authDbError.message);
    }
    
    // Fallback: Try user service API for additional profile info
    try {
      const axios = require('axios');
      const userProfileResponse = await axios.get(`http://localhost:3002/api/users/profiles/${userId}`, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-mock-token'
        }
      });
      
      if (userProfileResponse.data && userProfileResponse.data.success && userProfileResponse.data.data) {
        const profile = userProfileResponse.data.data;
        
        // Use location info for better identification if we don't have auth data
        if (profile.city && profile.region) {
          email = `user.${profile.city.toLowerCase()}.${userId.substring(0, 8)}@rabhan.sa`;
        }
        
        return {
          id: userId,
          first_name: firstName, // Keep original values or defaults
          last_name: lastName,
          email: email,
          phone: phone
        };
      }
    } catch (profileError) {
      console.log('User service API also failed');
    }
    
    // Final fallback
    return {
      id: userId,
      first_name: firstName,
      last_name: lastName,
      email: email,
      phone: phone
    };
  } catch (error) {
    console.error('Error fetching user details:', error.message);
    return {
      id: userId,
      first_name: 'User',
      last_name: 'Unknown',
      email: `user${userId.substring(0, 8)}@rabhan.sa`,
      phone: null
    };
  }
}

// Get contractor's assigned requests
app.get('/api/quotes/contractor/assigned-requests', async (req, res) => {
  try {
    const userIdFromHeader = req.headers['x-contractor-id'] || '48dbdfb7-d07f-4ab0-be26-7ec17568f6fc';
    
    // Map user_id to contractor_id
    const contractorId = await getContractorIdFromUserId(userIdFromHeader);
    
    if (!contractorId) {
      return res.status(404).json({
        success: false,
        message: 'Contractor profile not found for this user'
      });
    }
    
    console.log(`📋 User ${userIdFromHeader} (Contractor ${contractorId}) requesting assigned requests`);
    
    const assignmentsQuery = `
      SELECT qr.*, cqa.status as assignment_status, cqa.assigned_at
      FROM quote_requests qr
      INNER JOIN contractor_quote_assignments cqa ON qr.id = cqa.request_id
      WHERE cqa.contractor_id = $1
      ORDER BY cqa.assigned_at DESC
    `;
    
    const result = await pool.query(assignmentsQuery, [contractorId]);
    
    res.json({
      success: true,
      message: 'Assigned requests retrieved successfully',
      data: {
        requests: result.rows,
        total: result.rows.length
      }
    });

  } catch (error) {
    console.error('Error in assigned-requests endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assigned requests',
      error: error.message
    });
  }
});

// Get available requests for contractor
app.get('/api/quotes/contractor/available-requests', async (req, res) => {
  try {
    const userIdFromHeader = req.headers['x-contractor-id'] || '48dbdfb7-d07f-4ab0-be26-7ec17568f6fc';
    
    // Map user_id to contractor_id
    const contractorId = await getContractorIdFromUserId(userIdFromHeader);
    
    if (!contractorId) {
      return res.status(404).json({
        success: false,
        message: 'Contractor profile not found for this user'
      });
    }
    
    console.log(`📋 User ${userIdFromHeader} (Contractor ${contractorId}) requesting available requests`);
    
    const availableQuery = `
      SELECT qr.*
      FROM quote_requests qr
      WHERE qr.status = 'pending' 
        AND qr.id NOT IN (
          SELECT request_id 
          FROM contractor_quote_assignments 
          WHERE contractor_id = $1
        )
      ORDER BY qr.created_at DESC
      LIMIT 10
    `;
    
    const result = await pool.query(availableQuery, [contractorId]);
    
    res.json({
      success: true,
      message: 'Available requests retrieved successfully',
      data: {
        requests: result.rows,
        total: result.rows.length
      }
    });

  } catch (error) {
    console.error('Error in available-requests endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available requests',
      error: error.message
    });
  }
});

// Apply for/Accept a quote request
app.post('/api/quotes/contractor/apply/:request_id', async (req, res) => {
  try {
    const { request_id } = req.params;
    const userIdFromHeader = req.headers['x-contractor-id'] || '48dbdfb7-d07f-4ab0-be26-7ec17568f6fc';
    
    // Map user_id to contractor_id
    const contractorId = await getContractorIdFromUserId(userIdFromHeader);
    
    if (!contractorId) {
      return res.status(404).json({
        success: false,
        message: 'Contractor profile not found for this user'
      });
    }
    
    console.log(`📋 User ${userIdFromHeader} (Contractor ${contractorId}) applying for request ${request_id}`);
    
    // Check if contractor is already assigned to this request
    const existingAssignment = await pool.query(`
      SELECT id FROM contractor_quote_assignments 
      WHERE request_id = $1 AND contractor_id = $2
    `, [request_id, contractorId]);
    
    if (existingAssignment.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Contractor already assigned to this request'
      });
    }
    
    // Check if request exists and is still available
    const requestCheck = await pool.query(`
      SELECT id, selected_contractors, max_contractors 
      FROM quote_requests 
      WHERE id = $1 AND status = 'pending'
    `, [request_id]);
    
    if (requestCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Quote request not found or not available'
      });
    }
    
    const request = requestCheck.rows[0];
    const selectedContractors = request.selected_contractors || [];
    
    // Check if max contractors limit reached
    if (selectedContractors.length >= request.max_contractors) {
      return res.status(400).json({
        success: false,
        message: 'Maximum contractors limit reached for this request'
      });
    }
    
    // Add contractor to selected_contractors array (PostgreSQL array format)
    await pool.query(`
      UPDATE quote_requests 
      SET selected_contractors = array_append(COALESCE(selected_contractors, '{}'), $1), 
          updated_at = NOW()
      WHERE id = $2
    `, [contractorId, request_id]);
    
    // Create assignment record
    await pool.query(`
      INSERT INTO contractor_quote_assignments (
        request_id, contractor_id, status, assigned_at
      ) VALUES ($1, $2, 'assigned', NOW())
    `, [request_id, contractorId]);
    
    res.json({
      success: true,
      message: 'Successfully applied for quote request',
      data: {
        request_id,
        contractor_id: contractorId,
        status: 'assigned'
      }
    });

  } catch (error) {
    console.error('Error in contractor apply endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to apply for quote request',
      error: error.message
    });
  }
});

// Get contractor's submitted quotes
app.get('/api/quotes/contractor/my-quotes', async (req, res) => {
  try {
    // Add cache-busting headers
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    const userIdFromHeader = req.headers['x-contractor-id'] || '48dbdfb7-d07f-4ab0-be26-7ec17568f6fc';
    
    // Map user_id to contractor_id
    const contractorId = await getContractorIdFromUserId(userIdFromHeader);
    
    if (!contractorId) {
      return res.status(404).json({
        success: false,
        message: 'Contractor profile not found for this user'
      });
    }
    
    console.log(`📋 User ${userIdFromHeader} (Contractor ${contractorId}) requesting my quotes`);
    
    const quotesQuery = `
      SELECT cq.*, qr.system_size_kwp, qr.location_address
      FROM contractor_quotes cq
      JOIN quote_requests qr ON cq.request_id = qr.id
      WHERE cq.contractor_id = $1
      ORDER BY cq.created_at DESC
    `;
    
    const result = await pool.query(quotesQuery, [contractorId]);
    
    // Fetch line items for each quote
    for (const quote of result.rows) {
      try {
        const lineItemsQuery = `
          SELECT * FROM quotation_line_items 
          WHERE quotation_id = $1 
          ORDER BY id
        `;
        const lineItemsResult = await pool.query(lineItemsQuery, [quote.id]);
        quote.line_items = lineItemsResult.rows;
      } catch (error) {
        console.log('Error fetching line items for contractor quote', quote.id, ':', error.message);
        quote.line_items = [];
      }
    }
    
    res.json({
      success: true,
      message: 'Contractor quotes retrieved successfully',
      data: {
        quotes: result.rows.map(row => ({
          ...row,
          total_price: parseFloat(row.base_price),
          status: row.admin_status === 'approved' ? 'submitted' : row.admin_status
        })),
        total: result.rows.length
      }
    });

  } catch (error) {
    console.error('Error in my-quotes endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contractor quotes',
      error: error.message
    });
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: err.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Quote Service (Production) running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`👤 User endpoints: /api/quotes/my-requests, /api/quotes/request/:id/quotes`);
  console.log(`🏗️  Contractor endpoints: /api/quotes/contractor/*`);
  console.log('✅ Connected to PostgreSQL with real data');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🔄 Shutting down gracefully...');
  await pool.end();
  process.exit(0);
});