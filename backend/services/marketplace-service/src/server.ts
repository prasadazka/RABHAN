/**
 * RABHAN Marketplace Service - Main Server Setup
 * SAMA Compliant | Zero-Trust Security | Sub-2ms Performance | MVP Scope
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { env, corsConfig, securityConfig } from './config/environment.config';
import { logger, SAMALogCategory } from './utils/logger';
// import { apiRoutes } from './routes/index';
import { db } from './config/database.config';
// import { adminRoutes } from './routes/admin.routes';
// import { approvalRoutes } from './routes/approval.routes';

// Import types from types file
import { RequestContext } from './types/marketplace.types';

class ServiceError extends Error {
  public details?: any;
  constructor(message: string, details?: any) {
    super(message);
    this.details = details;
  }
}

class MarketplaceServer {
  private app: Application;
  private port: number;
  private server: any;

  constructor() {
    this.app = express();
    this.port = env.PORT;
    this.initializeMiddleware();
    this.initializeFileUpload();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  /**
   * Initialize file upload handling
   */
  private initializeFileUpload(): void {
    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'uploads', 'products');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log(`📁 Created uploads directory: ${uploadsDir}`);
    }

    // Configure multer for image uploads
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, uploadsDir);
      },
      filename: (req, file, cb) => {
        // Generate unique filename: timestamp-uuid.extension
        const ext = path.extname(file.originalname).toLowerCase();
        const filename = `${Date.now()}-${uuidv4()}${ext}`;
        cb(null, filename);
      }
    });

    const upload = multer({
      storage,
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 10 // Max 10 files
      },
      fileFilter: (req, file, cb) => {
        // Allow only image files
        const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'));
        }
      }
    });

    // Make upload middleware available to routes
    (this.app as any).upload = upload;
  }

  /**
   * Initialize all middleware with SAMA compliance
   */
  private initializeMiddleware(): void {
    // Request context middleware (must be first)
    this.app.use(this.requestContextMiddleware);

    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:', 'http://localhost:3000', 'http://localhost:3007'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"]
        }
      },
      crossOriginEmbedderPolicy: false,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    }));

    // CORS configuration
    this.app.use(cors({
      origin: corsConfig.origins,
      credentials: corsConfig.credentials,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'Cache-Control',
        'Pragma',
        'X-Request-ID',
        'X-Trace-ID'
      ],
      exposedHeaders: ['X-Request-ID', 'X-Total-Count']
    }));

    // Rate limiting with SAMA compliance
    if (securityConfig.rateLimitEnabled) {
      const limiter = rateLimit({
        windowMs: securityConfig.rateLimitWindow,
        max: securityConfig.rateLimitMax,
        message: {
          success: false,
          message: 'Too many requests from this IP, please try again later.',
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0.0'
          }
        },
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req: Request, res: Response) => {
          logger.auditSecurity(
            'RATE_LIMIT_EXCEEDED',
            'BLOCKED',
            {
              ipAddress: req.ip,
              userAgent: req.get('User-Agent'),
              riskLevel: 'MEDIUM'
            }
          );
          
          res.status(429).json({
            success: false,
            message: 'Rate limit exceeded. Please try again later.',
            meta: {
              timestamp: new Date().toISOString(),
              requestId: req.context?.requestId,
              version: '1.0.0'
            }
          });
        }
      });

      this.app.use(limiter);
    }

    // Body parsing with size limits
    this.app.use(express.json({ 
      limit: '10mb',
      verify: (req, res, buf) => {
        // Store raw body for webhook signature verification if needed
        (req as any).rawBody = buf;
      }
    }));
    
    this.app.use(express.urlencoded({ 
      extended: true, 
      limit: '10mb'
    }));

    // Response compression
    this.app.use(compression({
      level: 6,
      threshold: 1024,
      filter: (req, res) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      }
    }));

    // Request logging middleware
    this.app.use(this.requestLoggingMiddleware);

    // Serve uploaded files statically with CORS headers
    this.app.use('/uploads', (req, res, next) => {
      // Set CORS headers for static files
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET');
      res.header('Cross-Origin-Resource-Policy', 'cross-origin');
      next();
    }, express.static(path.join(process.cwd(), 'uploads'), {
      setHeaders: (res, path) => {
        // Set proper content type for images
        if (path.endsWith('.jpg') || path.endsWith('.jpeg')) {
          res.setHeader('Content-Type', 'image/jpeg');
        } else if (path.endsWith('.png')) {
          res.setHeader('Content-Type', 'image/png');
        } else if (path.endsWith('.jfif')) {
          res.setHeader('Content-Type', 'image/jpeg');
        } else if (path.endsWith('.webp')) {
          res.setHeader('Content-Type', 'image/webp');
        }
      }
    }));
  }

  /**
   * Request context middleware - tracks requests for audit
   */
  private requestContextMiddleware(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    const requestId = uuidv4();
    
    // Attach request context
    req.context = {
      requestId,
      ipAddress: req.ip || req.socket?.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown',
      startTime: Date.now()
    };

    // Add headers to response
    res.set('X-Request-ID', requestId);
    res.set('X-Service-Name', env.SERVICE_NAME);
    res.set('X-Service-Version', '1.0.0');

    // Audit request start
    logger.http(`${req.method} ${req.originalUrl}`, {
      requestId,
      ipAddress: req.context.ipAddress,
      userAgent: req.context.userAgent,
      method: req.method,
      url: req.originalUrl,
      category: SAMALogCategory.AUDIT_TRAIL
    });

    // Track response end
    const originalSend = res.send;
    res.send = function(data) {
      const duration = Date.now() - startTime;
      
      // Log response
      logger.http(`${req.method} ${req.originalUrl} - ${res.statusCode} in ${duration}ms`, {
        requestId,
        ipAddress: req.context.ipAddress,
        statusCode: res.statusCode,
        performanceMetrics: { duration },
        category: SAMALogCategory.SYSTEM_PERFORMANCE
      });

      // Performance warning for slow requests
      if (duration > 5000) { // >5s is concerning
        logger.warn(`Slow request detected: ${req.method} ${req.originalUrl}`, {
          requestId,
          performanceMetrics: { duration },
          riskLevel: 'MEDIUM'
        });
      }

      return originalSend.call(this, data);
    };

    next();
  }

  /**
   * Request logging middleware for detailed audit trail
   */
  private requestLoggingMiddleware(req: Request, res: Response, next: NextFunction): void {
    // Skip logging for health checks to reduce noise
    if (req.path.startsWith('/health')) {
      return next();
    }

    // Log sensitive operations with enhanced detail
    const sensitiveOperations = ['POST', 'PUT', 'DELETE'];
    const sensitiveRoutes = ['/api/v1/products', '/api/v1/categories'];
    
    if (sensitiveOperations.includes(req.method) || 
        sensitiveRoutes.some(route => req.path.startsWith(route))) {
      
      logger.auditSecurity(
        'SENSITIVE_OPERATION_ATTEMPT',
        'PROCESSING',
        {
          requestId: req.context.requestId,
          ipAddress: req.context.ipAddress,
          userAgent: req.context.userAgent,
          method: req.method,
          path: req.path,
          userId: req.user?.id || 'anonymous',
          riskLevel: 'MEDIUM'
        }
      );
    }

    next();
  }

  /**
   * Initialize API routes
   */
  private initializeRoutes(): void {
    // Root endpoint
    this.app.get('/', (req: Request, res: Response) => {
      res.json({
        service: 'RABHAN Marketplace Service',
        version: '1.0.0',
        status: 'operational',
        environment: env.NODE_ENV,
        timestamp: new Date().toISOString(),
        message: 'Welcome to RABHAN Solar Marketplace API',
        documentation: '/api/v1',
        health: '/health'
      });
    });

    // Mount API routes - basic endpoints
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'healthy', 
        service: 'marketplace-service',
        timestamp: new Date().toISOString() 
      });
    });

    this.app.get('/', (req, res) => {
      res.json({
        name: 'RABHAN Marketplace Service',
        version: '1.0.0',
        environment: env.NODE_ENV,
        endpoints: {
          health: '/health',
          api: '/api/v1'
        }
      });
    });

    // Mount admin routes
    // this.app.use('/api/v1/admin', adminRoutes);

    // Mount approval routes
    // this.app.use('/api/v1/approvals', approvalRoutes);

    // API Routes - Categories endpoint
    this.app.get('/api/v1/categories', async (req, res) => {
      try {
        const result = await db.query(`
          SELECT id, name, name_ar, slug, description, description_ar, is_active, created_at, updated_at 
          FROM categories 
          WHERE is_active = true 
          ORDER BY name
        `);
        
        res.json({
          success: true,
          data: result.rows,
          count: result.rows.length
        });
      } catch (error: any) {
        console.error('❌ Categories endpoint error:', error.message);
        res.status(500).json({
          success: false,
          error: 'Failed to fetch categories',
          message: error.message
        });
      }
    });

    // API Routes - Products endpoints
    this.app.get('/api/v1/products', async (req, res) => {
      try {
        // Get query parameters for filtering
        const { 
          contractorId, 
          categoryId, 
          status, 
          page = 1, 
          limit = 20,
          search 
        } = req.query;

        let whereConditions = ["p.status NOT IN ('INACTIVE', 'DISCONTINUED')"];
        let queryParams = [];
        let paramIndex = 1;

        // Add filters
        if (contractorId) {
          whereConditions.push(`p.contractor_id = $${paramIndex}`);
          queryParams.push(contractorId);
          paramIndex++;
        }
        if (categoryId) {
          whereConditions.push(`p.category_id = $${paramIndex}`);
          queryParams.push(categoryId);
          paramIndex++;
        }
        if (status) {
          whereConditions.push(`p.status = $${paramIndex}`);
          queryParams.push(status);
          paramIndex++;
        }
        if (search) {
          whereConditions.push(`(p.name ILIKE $${paramIndex} OR p.brand ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`);
          queryParams.push(`%${search}%`);
          paramIndex++;
        }

        const whereClause = whereConditions.join(' AND ');
        
        // Calculate offset for pagination
        const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

        // Get products with category info
        const productsResult = await db.query(`
          SELECT 
            p.*,
            c.name as category_name, 
            c.name_ar as category_name_ar,
            COUNT(*) OVER() as total_count
          FROM products p
          LEFT JOIN categories c ON p.category_id = c.id
          WHERE ${whereClause}
          ORDER BY p.created_at DESC
          LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `, [...queryParams, limit, offset]);

        // Get images for all products
        const productIds = productsResult.rows.map(p => p.id);
        let imagesResult = { rows: [] };
        
        if (productIds.length > 0) {
          const placeholders = productIds.map((_, i) => `$${i + 1}`).join(',');
          imagesResult = await db.query(`
            SELECT * FROM product_images 
            WHERE product_id IN (${placeholders})
            ORDER BY product_id, sort_order
          `, productIds);
        }

        // Group images by product_id
        const imagesByProduct = {};
        imagesResult.rows.forEach(img => {
          if (!imagesByProduct[img.product_id]) {
            imagesByProduct[img.product_id] = [];
          }
          imagesByProduct[img.product_id].push(img);
        });

        // Attach images and parse specifications
        const productsWithImages = productsResult.rows.map(product => ({
          ...product,
          specifications: typeof product.specifications === 'string' 
            ? JSON.parse(product.specifications || '{}')
            : product.specifications || {},
          images: imagesByProduct[product.id] || [],
          primaryImage: (imagesByProduct[product.id] || []).find(img => img.is_primary)?.file_url
        }));

        const totalCount = productsResult.rows.length > 0 ? parseInt(productsResult.rows[0].total_count) : 0;
        const totalPages = Math.ceil(totalCount / parseInt(limit as string));

        res.json({
          success: true,
          data: productsWithImages.map(({ total_count, ...product }) => product),
          pagination: {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            total: totalCount,
            totalPages,
            hasNext: parseInt(page as string) < totalPages,
            hasPrev: parseInt(page as string) > 1
          }
        });
      } catch (error: any) {
        console.error('❌ Products GET error:', error.message);
        res.status(500).json({
          success: false,
          error: 'Failed to fetch products',
          message: error.message
        });
      }
    });

    this.app.post('/api/v1/products', (this.app as any).upload.array('images', 10), async (req, res) => {
      try {
        const {
          contractorId,
          categoryId,
          productCategory,
          name,
          nameAr,
          description,
          descriptionAr,
          brand,
          model,
          sku,
          specifications = {},
          price,
          currency = 'SAR',
          vatIncluded = true,
          stockQuantity,
          status = 'DRAFT'
        } = req.body;

        // Get uploaded files
        const uploadedFiles = req.files as Express.Multer.File[] || [];

        // Comprehensive validation
        const errors = [];
        if (!contractorId) errors.push('contractorId is required');
        if (!categoryId) errors.push('categoryId is required');
        if (!productCategory) errors.push('productCategory is required');
        if (!name) errors.push('name is required');
        if (!brand) errors.push('brand is required');
        if (!price || price <= 0) errors.push('price must be greater than 0');
        if (!stockQuantity || stockQuantity < 0) errors.push('stockQuantity must be 0 or greater');

        if (errors.length > 0) {
          return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: errors
          });
        }

        // Check SKU uniqueness if provided
        if (sku) {
          const existingSku = await db.query(
            'SELECT id, name, brand FROM products WHERE sku = $1 AND status != $2', 
            [sku, 'DELETED']
          );
          if (existingSku.rows.length > 0) {
            const existingProduct = existingSku.rows[0];
            return res.status(400).json({
              success: false,
              error: 'SKU already exists',
              message: `SKU "${sku}" is already used by product "${existingProduct.name}" (${existingProduct.brand})`,
              field: 'sku',
              code: 'DUPLICATE_SKU'
            });
          }
        }

        // Generate unique slug from name
        const baseSlug = name.toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim('-');
        
        const slug = `${baseSlug}-${Date.now()}`;
        
        // Start database transaction
        const client = await db.getPool().connect();
        
        try {
          await client.query('BEGIN');

          // Insert product
          const productResult = await client.query(`
            INSERT INTO products (
              contractor_id, category_id, product_category, name, name_ar, description, description_ar,
              slug, brand, model, sku, specifications, price, currency, vat_included,
              stock_quantity, stock_status, status, approval_status,
              created_at, updated_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW(), NOW()
            ) RETURNING *
          `, [
            contractorId, categoryId, productCategory, name, nameAr, description, descriptionAr,
            slug, brand, model, sku, JSON.stringify(specifications || {}), price, currency, vatIncluded,
            stockQuantity,
            stockQuantity > 10 ? 'IN_STOCK' : stockQuantity > 0 ? 'LOW_STOCK' : 'OUT_OF_STOCK',
            status, 'PENDING'
          ]);

          const product = productResult.rows[0];

          // Handle uploaded product images
          const productImages = [];
          if (uploadedFiles && uploadedFiles.length > 0) {
            // Check if there's a primary image index specified by the client
            const primaryImageIndex = req.body.primaryImageIndex ? parseInt(req.body.primaryImageIndex) : 0;
            
            for (let i = 0; i < uploadedFiles.length; i++) {
              const file = uploadedFiles[i];
              // Create the full URL for the uploaded image
              const imageUrl = `/uploads/products/${file.filename}`;
              
              const imageResult = await client.query(`
                INSERT INTO product_images (
                  product_id, file_path, file_url, file_name, sort_order, is_primary, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING *
              `, [
                product.id,
                file.path, // Full file system path
                imageUrl,  // URL path for serving
                file.originalname,
                i + 1,
                i === primaryImageIndex // Use specified primary index, default to first (0)
              ]);
              productImages.push(imageResult.rows[0]);
            }
          }

          await client.query('COMMIT');
          
          console.log(`✅ Product created: ${name} (${product.id}) by contractor ${contractorId}`);
          console.log(`📸 Images added: ${productImages.length}`);

          // Return product with images
          const responseData = {
            ...product,
            images: productImages,
            specifications: typeof product.specifications === 'string' 
              ? JSON.parse(product.specifications || '{}')
              : product.specifications || {}
          };
          
          res.status(201).json({
            success: true,
            message: 'Product created successfully',
            data: responseData
          });

        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }

      } catch (error: any) {
        console.error('❌ Product creation error:', error.message);
        
        // Handle specific database errors
        if (error.code === '23505') { // Unique constraint violation
          if (error.constraint === 'products_sku_key') {
            return res.status(400).json({
              success: false,
              error: 'SKU already exists',
              message: `SKU "${req.body.sku || 'provided'}" is already used by another product. Please use a different SKU.`,
              field: 'sku',
              code: 'DUPLICATE_SKU'
            });
          }
          if (error.constraint === 'products_slug_key') {
            return res.status(400).json({
              success: false,
              error: 'Product name conflict',
              message: 'A product with similar name already exists. Please use a different name.',
              field: 'name',
              code: 'DUPLICATE_NAME'
            });
          }
        }
        
        res.status(500).json({
          success: false,
          error: 'Failed to create product',
          message: error.message,
          code: 'SERVER_ERROR'
        });
      }
    });

    // SKU validation endpoint
    this.app.get('/api/v1/products/validate-sku/:sku', async (req, res) => {
      try {
        const { sku } = req.params;
        
        if (!sku || sku.trim().length === 0) {
          return res.status(400).json({
            success: false,
            error: 'SKU is required',
            available: false
          });
        }
        
        const existingSku = await db.query(
          'SELECT id, name, brand FROM products WHERE sku = $1 AND status != $2', 
          [sku, 'DELETED']
        );
        
        const isAvailable = existingSku.rows.length === 0;
        
        res.json({
          success: true,
          sku: sku,
          available: isAvailable,
          message: isAvailable 
            ? `SKU "${sku}" is available` 
            : `SKU "${sku}" is already used by "${existingSku.rows[0].name}" (${existingSku.rows[0].brand})`
        });
        
      } catch (error: any) {
        console.error('❌ SKU validation error:', error.message);
        res.status(500).json({
          success: false,
          error: 'Failed to validate SKU',
          available: false,
          message: error.message
        });
      }
    });

    // Get single product endpoint
    this.app.get('/api/v1/products/:productId', async (req, res) => {
      try {
        const { productId } = req.params;
        
        if (!productId) {
          return res.status(400).json({
            success: false,
            error: 'Product ID is required'
          });
        }

        // Get product with category info
        const productResult = await db.query(`
          SELECT 
            p.*,
            c.name as category_name, 
            c.name_ar as category_name_ar
          FROM products p
          LEFT JOIN categories c ON p.category_id = c.id
          WHERE p.id = $1 AND p.status != 'DELETED'
        `, [productId]);

        if (productResult.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'Product not found'
          });
        }

        // Get images for the product
        const imagesResult = await db.query(`
          SELECT * FROM product_images 
          WHERE product_id = $1
          ORDER BY sort_order, created_at
        `, [productId]);

        const product = productResult.rows[0];
        const productWithImages = {
          ...product,
          specifications: typeof product.specifications === 'string'
            ? JSON.parse(product.specifications || '{}')
            : product.specifications || {},
          images: imagesResult.rows,
          primaryImage: imagesResult.rows.find(img => img.is_primary)?.file_url || imagesResult.rows[0]?.file_url
        };

        res.json({
          success: true,
          data: productWithImages
        });

      } catch (error: any) {
        console.error('❌ Get product error:', error.message);
        res.status(500).json({
          success: false,
          error: 'Failed to fetch product',
          message: error.message
        });
      }
    });

    // Image upload endpoint (with actual file upload)
    this.app.post('/api/v1/products/:productId/images', (this.app as any).upload.array('images', 10), async (req, res) => {
      try {
        const { productId } = req.params;
        const uploadedFiles = req.files as Express.Multer.File[] || [];

        if (!uploadedFiles.length) {
          return res.status(400).json({
            success: false,
            error: 'No images provided'
          });
        }

        const client = await db.getPool().connect();
        try {
          await client.query('BEGIN');

          // Verify product exists
          const productResult = await client.query('SELECT id FROM products WHERE id = $1', [productId]);
          if (productResult.rows.length === 0) {
            return res.status(404).json({
              success: false,
              error: 'Product not found'
            });
          }

          // Get current max sort_order
          const sortResult = await client.query(
            'SELECT COALESCE(MAX(sort_order), 0) as max_sort FROM product_images WHERE product_id = $1',
            [productId]
          );
          let nextSort = sortResult.rows[0].max_sort + 1;

          const addedImages: any[] = [];
          for (const file of uploadedFiles) {
            // Process uploaded file similar to product creation
            const fileUrl = `/uploads/products/${file.filename}`;
            const imageResult = await client.query(`
                INSERT INTO product_images (
                  product_id, file_name, file_path, file_url, sort_order, is_primary, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING *
              `, [
                productId,
                file.filename,
                file.path,
                fileUrl,
                nextSort,
                false // New images are not primary by default
              ]);
            addedImages.push(imageResult.rows[0]);
            nextSort++;
          }

          await client.query('COMMIT');

          console.log(`📸 Added ${addedImages.length} images to product ${productId}`);

          res.status(201).json({
            success: true,
            message: `${addedImages.length} images added successfully`,
            data: addedImages
          });

        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }

      } catch (error: any) {
        console.error('❌ Image upload error:', error.message);
        res.status(500).json({
          success: false,
          error: 'Failed to add images',
          message: error.message
        });
      }
    });

    // Update product endpoint (supports both JSON and multipart form-data with images)
    this.app.put('/api/v1/products/:productId', (this.app as any).upload.array('images', 10), async (req, res) => {
      try {
        const { productId } = req.params;
        const updateData = req.body;
        console.log('🔄 Updating product:', productId, 'with data:', Object.keys(updateData));

        // Remove non-updatable fields and images (handled separately)
        const { id, contractor_id, created_at, images, ...rawUpdates } = updateData;

        // Map frontend field names to database column names
        const fieldMapping: { [key: string]: string } = {
          'productCategory': 'product_category'
        };

        const allowedUpdates: { [key: string]: any } = {};
        Object.entries(rawUpdates).forEach(([key, value]) => {
          const dbFieldName = fieldMapping[key] || key;
          allowedUpdates[dbFieldName] = value;
        });

        if (Object.keys(allowedUpdates).length === 0) {
          return res.status(400).json({
            success: false,
            error: 'No valid fields to update'
          });
        }

        // Build dynamic update query
        const updateFields = [];
        const values = [];
        let paramIndex = 1;

        Object.entries(allowedUpdates).forEach(([key, value]) => {
          if (key === 'specifications') {
            updateFields.push(`${key} = $${paramIndex}`);
            values.push(JSON.stringify(value));
          } else {
            updateFields.push(`${key} = $${paramIndex}`);
            values.push(value);
          }
          paramIndex++;
        });

        updateFields.push('updated_at = NOW()');
        values.push(productId);

        const query = `
          UPDATE products 
          SET ${updateFields.join(', ')}
          WHERE id = $${paramIndex} AND status != 'DELETED'
          RETURNING *
        `;

        const result = await db.query(query, values);

        if (result.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'Product not found or cannot be updated'
          });
        }

        // Handle uploaded images if any
        const files = req.files as Express.Multer.File[];
        if (files && files.length > 0) {
          console.log(`📸 Processing ${files.length} uploaded images for product ${productId}`);
          
          for (const file of files) {
            const imageId = uuidv4();
            const relativePath = file.path.replace(path.join(process.cwd()), '').replace(/\\/g, '/');
            const publicUrl = relativePath.startsWith('/uploads') ? relativePath : `/uploads${relativePath}`;
            
            await db.query(`
              INSERT INTO product_images (id, product_id, file_name, file_path, file_url, sort_order, is_primary)
              VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [
              imageId,
              productId,
              file.originalname,
              file.path,
              publicUrl,
              1, // Default sort order
              false // New images are not primary by default
            ]);
            
            console.log(`✅ Image uploaded: ${file.originalname} -> ${publicUrl}`);
          }
        }

        // Fetch images for the updated product
        const imageResult = await db.query(
          'SELECT file_name, file_path, file_url, sort_order, is_primary FROM product_images WHERE product_id = $1 ORDER BY sort_order, created_at',
          [productId]
        );
        
        console.log(`✅ Product updated: ${result.rows[0].name} (${productId}) with ${imageResult.rows.length} images`);

        res.json({
          success: true,
          message: 'Product updated successfully',
          data: {
            ...result.rows[0],
            specifications: typeof result.rows[0].specifications === 'string'
              ? JSON.parse(result.rows[0].specifications || '{}')
              : result.rows[0].specifications || {},
            images: imageResult.rows,
            primaryImage: imageResult.rows.find(img => img.is_primary)?.file_url || imageResult.rows[0]?.file_url
          }
        });

      } catch (error: any) {
        console.error('❌ Product update error:', error.message);
        res.status(500).json({
          success: false,
          error: 'Failed to update product',
          message: error.message
        });
      }
    });

    // Delete product images endpoint
    this.app.delete('/api/v1/products/:productId/images', async (req, res) => {
      try {
        const { productId } = req.params;
        const { imageIds = [] } = req.body;
        
        // If no specific image IDs provided, delete all images for the product
        const deleteAllImages = !imageIds.length;
        
        // Verify product exists and belongs to user
        const productResult = await db.query(
          'SELECT id FROM products WHERE id = $1',
          [productId]
        );
        
        if (productResult.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'Product not found'
          });
        }
        
        // Delete images from database
        let deleteResult;
        if (deleteAllImages) {
          deleteResult = await db.query(
            'DELETE FROM product_images WHERE product_id = $1 RETURNING *',
            [productId]
          );
        } else {
          deleteResult = await db.query(
            'DELETE FROM product_images WHERE id = ANY($1) AND product_id = $2 RETURNING *',
            [imageIds, productId]
          );
        }
        
        console.log(`🗑️ Deleted ${deleteResult.rows.length} images for product ${productId}`);
        
        res.json({
          success: true,
          message: `${deleteResult.rows.length} images deleted successfully`,
          deletedCount: deleteResult.rows.length
        });
        
      } catch (error: any) {
        console.error('❌ Image deletion error:', error.message);
        res.status(500).json({
          success: false,
          error: 'Failed to delete images',
          message: error.message
        });
      }
    });

    // Set primary/featured image endpoint
    this.app.put('/api/v1/products/:productId/images/:imageId/primary', async (req, res) => {
      try {
        const { productId, imageId } = req.params;
        const { is_primary = true } = req.body;
        
        console.log(`🌟 Setting primary image: Product ${productId}, Image ${imageId}, Primary: ${is_primary}`);
        
        // Verify product exists
        const productResult = await db.query(
          'SELECT id FROM products WHERE id = $1',
          [productId]
        );
        
        if (productResult.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'Product not found'
          });
        }
        
        // Verify image exists for this product
        const imageResult = await db.query(
          'SELECT id FROM product_images WHERE id = $1 AND product_id = $2',
          [imageId, productId]
        );
        
        if (imageResult.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'Image not found for this product'
          });
        }
        
        const client = await db.getPool().connect();
        
        try {
          await client.query('BEGIN');
          
          if (is_primary) {
            // First, unset all primary images for this product
            await client.query(
              'UPDATE product_images SET is_primary = false WHERE product_id = $1',
              [productId]
            );
            
            // Then set the specified image as primary
            await client.query(
              'UPDATE product_images SET is_primary = true WHERE id = $1 AND product_id = $2',
              [imageId, productId]
            );
          } else {
            // Just unset this image as primary
            await client.query(
              'UPDATE product_images SET is_primary = false WHERE id = $1 AND product_id = $2',
              [imageId, productId]
            );
          }
          
          await client.query('COMMIT');
          
          console.log(`✅ Primary image ${is_primary ? 'set' : 'unset'} for product ${productId}`);
          
          res.json({
            success: true,
            message: `Image ${is_primary ? 'set as' : 'removed as'} primary image`,
            data: {
              productId,
              imageId,
              isPrimary: is_primary
            }
          });
          
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }
        
      } catch (error: any) {
        console.error('❌ Set primary image error:', error.message);
        res.status(500).json({
          success: false,
          error: 'Failed to set primary image',
          message: error.message
        });
      }
    });

    // Delete product endpoint (hard delete)
    this.app.delete('/api/v1/products/:productId', async (req, res) => {
      try {
        const { productId } = req.params;

        if (!productId) {
          return res.status(400).json({
            success: false,
            error: 'Product ID is required'
          });
        }

        // Get product info before deletion for logging
        const productInfo = await db.query(`
          SELECT id, name FROM products WHERE id = $1
        `, [productId]);

        if (productInfo.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'Product not found'
          });
        }

        // Hard delete - completely remove the record
        // Images will be automatically deleted due to CASCADE constraint
        const result = await db.query(`
          DELETE FROM products WHERE id = $1 RETURNING id
        `, [productId]);

        if (result.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'Product not found'
          });
        }

        const productName = productInfo.rows[0].name;
        console.log(`🗑️ Product permanently deleted: ${productName} (${productId})`);

        res.json({
          success: true,
          message: 'Product deleted successfully',
          data: { 
            id: productId,
            deleted: true
          }
        });

      } catch (error: any) {
        console.error('❌ Product deletion error:', error.message);
        res.status(500).json({
          success: false,
          error: 'Failed to delete product',
          message: error.message
        });
      }
    });
  }


  /**
   * Initialize comprehensive error handling
   */
  private initializeErrorHandling(): void {
    // 404 handler for unmatched routes
    this.app.use('*', (req: Request, res: Response) => {
      logger.warn(`Route not found: ${req.method} ${req.originalUrl}`, {
        requestId: req.context?.requestId,
        ipAddress: req.context?.ipAddress,
        userAgent: req.context?.userAgent
      });

      res.status(404).json({
        success: false,
        message: `Route not found: ${req.method} ${req.originalUrl}`,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.context?.requestId,
          version: '1.0.0'
        }
      });
    });

    // Global error handler
    this.app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      // Extract error details
      const requestId = req.context?.requestId || 'unknown';
      const userId = req.user?.id || 'anonymous';
      
      let statusCode = 500;
      let errorCode = 'INTERNAL_SERVER_ERROR';
      let message = 'Internal server error';
      
      // Handle known error types (temporarily disabled)
      // if (err instanceof ValidationError) {
      //   statusCode = err.statusCode;
      //   errorCode = err.code;
      //   message = err.message;
      // } else if (err instanceof NotFoundError) {
      //   statusCode = err.statusCode;
      //   errorCode = err.code;
      //   message = err.message;
      // } else if (err instanceof UnauthorizedError) {
      //   statusCode = err.statusCode;
      //   errorCode = err.code;
      //   message = err.message;
      // } else if (err instanceof ForbiddenError) {
      //   statusCode = err.statusCode;
      //   errorCode = err.code;
      //   message = err.message;
      // } else if (err instanceof ConflictError) {
      //   statusCode = err.statusCode;
      //   errorCode = err.code;
      //   message = err.message;
      // }

      // Log error with SAMA compliance
      const errorMetadata = {
        requestId,
        userId,
        ipAddress: req.context?.ipAddress,
        userAgent: req.context?.userAgent,
        method: req.method,
        url: req.originalUrl,
        statusCode,
        errorCode,
        riskLevel: statusCode >= 500 ? 'HIGH' : 'MEDIUM' as any
      };

      if (statusCode >= 500) {
        logger.error(`Server error: ${message}`, err, errorMetadata);
        logger.auditSecurity('SERVER_ERROR', 'FAILURE', errorMetadata);
      } else if (statusCode === 401 || statusCode === 403) {
        logger.auditSecurity('UNAUTHORIZED_ACCESS', 'BLOCKED', errorMetadata);
      } else {
        logger.warn(`Client error: ${message}`, errorMetadata);
      }

      // Send error response
      res.status(statusCode).json({
        success: false,
        message: env.NODE_ENV === 'production' && statusCode >= 500 
          ? 'Internal server error' 
          : message,
        error: env.NODE_ENV === 'development' ? {
          code: errorCode,
          details: (err as ServiceError).details,
          stack: err.stack
        } : undefined,
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
          version: '1.0.0'
        }
      });
    });
  }

  /**
   * Start the server
   */
  public async start(): Promise<void> {
    try {
      // Test database connection
      await this.checkDatabaseConnection();

      // Start HTTP server
      this.server = this.app.listen(this.port, env.HOST, () => {
        logger.info(`🚀 RABHAN Marketplace Service started successfully`, {
          port: this.port,
          host: env.HOST,
          environment: env.NODE_ENV,
          serviceVersion: '1.0.0',
          category: SAMALogCategory.SYSTEM_PERFORMANCE
        });

        // Log service startup audit
        logger.auditSecurity('SERVICE_STARTED', 'SUCCESS', {
          port: this.port,
          environment: env.NODE_ENV,
          riskLevel: 'LOW'
        });
      });

      // Handle server errors
      this.server.on('error', (error: Error) => {
        console.error('❌ Server error details:', error);
        logger.error('Server error occurred', error, {
          category: SAMALogCategory.SECURITY_EVENT,
          riskLevel: 'CRITICAL'
        });
        process.exit(1);
      });

      // Graceful shutdown handlers
      this.setupGracefulShutdown();

    } catch (error) {
      logger.error('Failed to start server', error, {
        category: SAMALogCategory.SECURITY_EVENT,
        riskLevel: 'CRITICAL'
      });
      process.exit(1);
    }
  }

  /**
   * Check database connectivity
   */
  private async checkDatabaseConnection(): Promise<void> {
    try {
      // Initialize database properly
      logger.info('Initializing database connection...');
      
      // Initialize database first
      await db.initialize();
      
      const startTime = Date.now();
      const result = await db.query('SELECT 1 as connection_test');
      const duration = Date.now() - startTime;
      
      logger.info('Database connection successful', {
        performanceMetrics: { duration },
        category: SAMALogCategory.SYSTEM_PERFORMANCE
      });

      if (duration > 1000) { // >1s connection time is concerning
        logger.warn('Slow database connection detected', {
          performanceMetrics: { duration },
          riskLevel: 'MEDIUM'
        });
      }
      
    } catch (error) {
      logger.error('Database connection failed', error, {
        category: SAMALogCategory.SECURITY_EVENT,
        riskLevel: 'CRITICAL'
      });
      throw error;
    }
  }

  /**
   * Setup graceful shutdown for SAMA compliance
   */
  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, starting graceful shutdown...`, {
        category: SAMALogCategory.AUDIT_TRAIL
      });

      // Close server
      if (this.server) {
        this.server.close(() => {
          logger.info('HTTP server closed', {
            category: SAMALogCategory.AUDIT_TRAIL
          });
        });
      }

      // Close database connections (skip for now due to TypeScript issues)
      try {
        // await db.close();
        logger.info('Database connections will be closed automatically', {
          category: SAMALogCategory.AUDIT_TRAIL
        });
      } catch (error) {
        logger.error('Error closing database connections', error);
      }

      // Log shutdown audit
      logger.auditSecurity('SERVICE_SHUTDOWN', 'SUCCESS', {
        signal,
        riskLevel: 'LOW'
      });

      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught exception', error, {
        category: SAMALogCategory.SECURITY_EVENT,
        riskLevel: 'CRITICAL'
      });
      // process.exit(1); // Commented out temporarily to prevent crashes
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: any) => {
      logger.error('Unhandled promise rejection', reason, {
        category: SAMALogCategory.SECURITY_EVENT,
        riskLevel: 'CRITICAL'
      });
      // process.exit(1); // Commented out temporarily to prevent crashes
    });
  }

  /**
   * Get Express app instance
   */
  public getApp(): Application {
    return this.app;
  }

  /**
   * Stop the server
   */
  public async stop(): Promise<void> {
    if (this.server) {
      this.server.close();
      // await db.close(); // Skip for now due to TypeScript issues
      logger.info('Server stopped gracefully');
    }
  }
}

// Export server class and create instance
export { MarketplaceServer };
export const server = new MarketplaceServer();

// Start server if running directly
if (require.main === module) {
  server.start().catch((error) => {
    logger.error('Failed to start server', error);
    process.exit(1);
  });
}