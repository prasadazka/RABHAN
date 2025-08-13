/**
 * RABHAN Marketplace Service - Order Service Layer
 * SAMA Compliant | Zero-Trust Security | Sub-2ms Performance | Complete Order Lifecycle
 */

import { db } from '@/config/database.config';
import { logger, SAMALogCategory } from '@/utils/logger';
import {
  Order,
  OrderCreate,
  OrderItem,
  OrderStatus,
  PaymentStatus,
  OrderStatusHistory,
  PaginationParams,
  PaginationResult,
  NotFoundError,
  ConflictError,
  ValidationError
} from '@/types/marketplace.types';

export class OrderService {
  
  /**
   * Create a new order with items
   * Performance target: <5ms (complex operation with multiple tables)
   */
  async createOrder(orderData: OrderCreate, userId: string): Promise<Order> {
    const startTime = process.hrtime.bigint();
    
    try {
      const client = await db.getPool().connect();
      
      try {
        await client.query('BEGIN');

        // Generate unique order number
        const orderNumber = await this.generateOrderNumber();

        // Validate all products exist and are available
        const productValidation = await this.validateOrderProducts(orderData.items);
        if (!productValidation.valid) {
          throw new ValidationError(productValidation.error || 'Product validation failed');
        }

        // Calculate order totals
        const totals = await this.calculateOrderTotals(orderData.items);

        // Create main order
        const orderQuery = `
          INSERT INTO orders (
            order_number, user_id, customer_name, customer_email, customer_phone,
            shipping_address_line1, shipping_address_line2, shipping_city, 
            shipping_region, shipping_postal_code, shipping_country,
            billing_same_as_shipping, billing_address_line1, billing_address_line2,
            billing_city, billing_region, billing_postal_code, billing_country,
            subtotal, tax_amount, shipping_cost, total_amount, currency,
            special_instructions, payment_method, installation_required,
            created_by, updated_by
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
            $19, $20, $21, $22, $23, $24, $25, $26, $27, $27
          )
          RETURNING id, created_at, updated_at
        `;

        const orderParams = [
          orderNumber,
          orderData.userId,
          orderData.customerName,
          orderData.customerEmail,
          orderData.customerPhone,
          orderData.shippingAddress.line1,
          orderData.shippingAddress.line2 || null,
          orderData.shippingAddress.city,
          orderData.shippingAddress.region,
          orderData.shippingAddress.postalCode || null,
          orderData.shippingAddress.country,
          orderData.billingSameAsShipping,
          orderData.billingAddress?.line1 || null,
          orderData.billingAddress?.line2 || null,
          orderData.billingAddress?.city || null,
          orderData.billingAddress?.region || null,
          orderData.billingAddress?.postalCode || null,
          orderData.billingAddress?.country || null,
          totals.subtotal,
          totals.taxAmount,
          totals.shippingCost,
          totals.totalAmount,
          'SAR',
          orderData.specialInstructions || null,
          orderData.paymentMethod || null,
          orderData.installationRequired,
          userId
        ];

        const orderResult = await client.query(orderQuery, orderParams);
        const orderId = orderResult.rows[0]?.id;

        // Create order items
        for (const item of orderData.items) {
          const product = productValidation.products.find(p => p.id === item.productId);
          if (!product) continue;

          const itemQuery = `
            INSERT INTO order_items (
              order_id, product_id, contractor_id, product_name, product_name_ar,
              product_sku, product_brand, product_model, unit_price, quantity,
              line_total, specifications, installation_required, installation_notes,
              warranty_period_months
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
            )
          `;

          const lineTotal = product.price * item.quantity;

          const itemParams = [
            orderId,
            item.productId,
            product.contractorId,
            product.name,
            product.nameAr || null,
            product.sku || null,
            product.brand,
            product.model || null,
            product.price,
            item.quantity,
            lineTotal,
            JSON.stringify(product.specifications),
            orderData.installationRequired,
            item.installationNotes || null,
            12 // Default 12 months warranty
          ];

          await client.query(itemQuery, itemParams);
        }

        // Create initial status history
        await this.createStatusHistory(orderId, null, 'PENDING', 'ORDER', 'Order created', null, userId, 'USER', client);

        await client.query('COMMIT');

        // Build complete order object
        const createdOrder: Order = {
          id: orderId,
          orderNumber,
          userId: orderData.userId,
          customerName: orderData.customerName,
          customerEmail: orderData.customerEmail,
          customerPhone: orderData.customerPhone,
          shippingAddress: orderData.shippingAddress as any,
          billingAddress: orderData.billingAddress as any,
          billingSameAsShipping: orderData.billingSameAsShipping,
          subtotal: totals.subtotal,
          taxAmount: totals.taxAmount,
          shippingCost: totals.shippingCost,
          discountAmount: 0,
          totalAmount: totals.totalAmount,
          currency: 'SAR',
          status: 'PENDING',
          paymentStatus: 'PENDING',
          specialInstructions: orderData.specialInstructions,
          paymentMethod: orderData.paymentMethod,
          installationRequired: orderData.installationRequired,
          samaReferenceNumber: orderNumber, // Use order number as SAMA reference
          complianceVerified: false,
          createdAt: orderResult.rows[0]?.created_at,
          updatedAt: orderResult.rows[0]?.updated_at,
          createdBy: userId,
          updatedBy: userId
        };

        // Performance monitoring
        const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
        logger.auditPerformance('CREATE_ORDER', duration, {
          orderId,
          itemCount: orderData.items.length,
          totalAmount: totals.totalAmount
        });

        // SAMA Audit: Order creation
        logger.auditDataAccess(
          userId,
          'orders',
          orderId,
          'CREATE',
          {
            orderNumber,
            totalAmount: totals.totalAmount,
            itemCount: orderData.items.length,
            installationRequired: orderData.installationRequired
          }
        );

        return createdOrder;

      } finally {
        client.release();
      }

    } catch (error) {
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.error('Failed to create order', error, {
        userId: orderData.userId,
        itemCount: orderData.items.length,
        performanceMetrics: { duration }
      });
      throw error;
    }
  }

  /**
   * Get order by ID with complete details
   * Performance target: <2ms
   */
  async getOrderById(orderId: string, userId?: string): Promise<Order | null> {
    const startTime = process.hrtime.bigint();
    
    try {
      // Main order query with optimization
      const orderQuery = `
        SELECT 
          o.*,
          array_agg(
            json_build_object(
              'id', oi.id,
              'productId', oi.product_id,
              'contractorId', oi.contractor_id,
              'productName', oi.product_name,
              'productNameAr', oi.product_name_ar,
              'productSku', oi.product_sku,
              'productBrand', oi.product_brand,
              'productModel', oi.product_model,
              'unitPrice', oi.unit_price,
              'quantity', oi.quantity,
              'lineTotal', oi.line_total,
              'specifications', oi.specifications,
              'installationRequired', oi.installation_required,
              'installationNotes', oi.installation_notes,
              'warrantyPeriodMonths', oi.warranty_period_months,
              'status', oi.status,
              'createdAt', oi.created_at,
              'updatedAt', oi.updated_at
            )
          ) FILTER (WHERE oi.id IS NOT NULL) as items
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        WHERE o.id = $1
        GROUP BY o.id
      `;

      const result = await db.query(orderQuery, [orderId]);
      
      if (result.rowCount === 0) {
        return null;
      }

      const order = this.mapRowToOrder(result.rows[0]);

      // Performance monitoring
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.auditPerformance('GET_ORDER_BY_ID', duration, {
        orderId,
        userId,
        itemCount: order.items?.length || 0
      });

      return order;

    } catch (error) {
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.error('Failed to get order by ID', error, {
        orderId,
        performanceMetrics: { duration }
      });
      throw error;
    }
  }

  /**
   * Get user orders with pagination
   * Performance target: <3ms
   */
  async getUserOrders(
    userId: string,
    pagination: PaginationParams,
    status?: OrderStatus
  ): Promise<PaginationResult<Order>> {
    const startTime = process.hrtime.bigint();
    
    try {
      const whereConditions = ['o.user_id = $1'];
      const params: any[] = [userId];
      let paramIndex = 2;

      if (status) {
        whereConditions.push(`o.status = $${paramIndex}`);
        params.push(status);
        paramIndex++;
      }

      const whereClause = whereConditions.join(' AND ');

      // Count total results
      const countQuery = `
        SELECT COUNT(*) as total
        FROM orders o
        WHERE ${whereClause}
      `;
      
      const countResult = await db.query(countQuery, params);
      const total = parseInt(countResult.rows[0]?.total || '0', 10);

      // Calculate pagination
      const offset = (pagination.page - 1) * pagination.limit;
      const totalPages = Math.ceil(total / pagination.limit);

      // Main query with items count
      const dataQuery = `
        SELECT 
          o.*,
          COUNT(oi.id) as item_count
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        WHERE ${whereClause}
        GROUP BY o.id
        ORDER BY o.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      params.push(pagination.limit, offset);

      const result = await db.query(dataQuery, params);
      const orders = result.rows.map(row => this.mapRowToOrder(row, false)); // Don't include items for list view

      const paginationResult: PaginationResult<Order> = {
        data: orders,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          totalPages,
          hasNext: pagination.page < totalPages,
          hasPrev: pagination.page > 1
        }
      };

      // Performance monitoring
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.auditPerformance('GET_USER_ORDERS', duration, {
        userId,
        resultCount: orders.length,
        totalResults: total
      });

      return paginationResult;

    } catch (error) {
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.error('Failed to get user orders', error, {
        userId,
        pagination,
        performanceMetrics: { duration }
      });
      throw error;
    }
  }

  /**
   * Update order status (Admin/System only)
   */
  async updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    userId: string,
    userRole: string,
    reason?: string,
    notes?: string
  ): Promise<Order> {
    const startTime = process.hrtime.bigint();
    
    try {
      const client = await db.getPool().connect();
      
      try {
        await client.query('BEGIN');

        // Get current order
        const currentOrder = await this.getOrderById(orderId);
        if (!currentOrder) {
          throw new NotFoundError('Order not found');
        }

        // Update order status
        const updateQuery = `
          UPDATE orders 
          SET status = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP
          WHERE id = $3
          RETURNING *
        `;

        const updateResult = await client.query(updateQuery, [newStatus, userId, orderId]);
        
        // Create status history
        await this.createStatusHistory(
          orderId,
          currentOrder.status,
          newStatus,
          'ORDER',
          reason || 'Status updated',
          notes || null,
          userId,
          userRole,
          client
        );

        await client.query('COMMIT');

        const updatedOrder = this.mapRowToOrder(updateResult.rows[0]);

        // Performance monitoring
        const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
        logger.auditPerformance('UPDATE_ORDER_STATUS', duration, {
          orderId,
          previousStatus: currentOrder.status,
          newStatus,
          userId
        });

        // SAMA Audit
        logger.auditDataAccess(
          userId,
          'orders',
          orderId,
          'UPDATE',
          {
            previousStatus: currentOrder.status,
            newStatus,
            reason,
            userRole
          }
        );

        return updatedOrder;

      } finally {
        client.release();
      }

    } catch (error) {
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.error('Failed to update order status', error, {
        orderId,
        newStatus,
        userId,
        performanceMetrics: { duration }
      });
      throw error;
    }
  }

  // =====================================================
  // PRIVATE HELPER METHODS
  // =====================================================

  private async generateOrderNumber(): Promise<string> {
    const prefix = 'RBH';
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const timestamp = Date.now().toString().slice(-6);
    
    let counter = 1;
    let orderNumber: string;
    
    do {
      const suffix = counter.toString().padStart(3, '0');
      orderNumber = `${prefix}${date}${timestamp}${suffix}`;
      
      const existsQuery = 'SELECT 1 FROM orders WHERE order_number = $1 LIMIT 1';
      const result = await db.query(existsQuery, [orderNumber]);
      
      if (result.rowCount === 0) {
        break;
      }
      
      counter++;
      if (counter > 999) {
        throw new Error('Unable to generate unique order number');
      }
    } while (true);
    
    return orderNumber;
  }

  private async validateOrderProducts(items: any[]): Promise<{valid: boolean; error?: string; products: any[]}> {
    const productIds = items.map(item => item.productId);
    
    const query = `
      SELECT id, contractor_id, name, name_ar, brand, model, sku, price, 
             specifications, stock_quantity, status, approval_status
      FROM products 
      WHERE id = ANY($1) AND status = 'ACTIVE' AND approval_status = 'APPROVED'
    `;
    
    const result = await db.query(query, [productIds]);
    
    if (result.rows.length !== productIds.length) {
      return {
        valid: false,
        error: 'Some products are not available or not approved',
        products: []
      };
    }

    // Check stock quantities
    for (const item of items) {
      const product = result.rows.find(p => p.id === item.productId);
      if (product && product.stock_quantity < item.quantity) {
        return {
          valid: false,
          error: `Insufficient stock for product ${product.name}. Available: ${product.stock_quantity}, Requested: ${item.quantity}`,
          products: []
        };
      }
    }

    return {
      valid: true,
      products: result.rows.map(row => ({
        id: row.id,
        contractorId: row.contractor_id,
        name: row.name,
        nameAr: row.name_ar,
        brand: row.brand,
        model: row.model,
        sku: row.sku,
        price: parseFloat(row.price),
        specifications: row.specifications || {},
        stockQuantity: row.stock_quantity
      }))
    };
  }

  private async calculateOrderTotals(items: any[]): Promise<{
    subtotal: number;
    taxAmount: number;
    shippingCost: number;
    totalAmount: number;
  }> {
    const productIds = items.map(item => item.productId);
    
    const query = 'SELECT id, price FROM products WHERE id = ANY($1)';
    const result = await db.query(query, [productIds]);
    
    let subtotal = 0;
    
    for (const item of items) {
      const product = result.rows.find(p => p.id === item.productId);
      if (product) {
        subtotal += parseFloat(product.price) * item.quantity;
      }
    }

    const taxRate = 0.15; // 15% VAT in Saudi Arabia
    const taxAmount = subtotal * taxRate;
    const shippingCost = 50; // Fixed shipping cost for MVP
    const totalAmount = subtotal + taxAmount + shippingCost;

    return {
      subtotal,
      taxAmount,
      shippingCost,
      totalAmount
    };
  }

  private async createStatusHistory(
    orderId: string,
    previousStatus: string | null,
    newStatus: string,
    statusType: string,
    reason: string,
    notes: string | null,
    changedBy: string,
    changedByRole: string,
    client: any
  ): Promise<void> {
    const query = `
      INSERT INTO order_status_history (
        order_id, previous_status, new_status, status_type, reason, notes, changed_by, changed_by_role
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;
    
    await client.query(query, [
      orderId, previousStatus, newStatus, statusType, reason, notes, changedBy, changedByRole
    ]);
  }

  private mapRowToOrder(row: any, includeItems: boolean = true): Order {
    return {
      id: row.id,
      orderNumber: row.order_number,
      userId: row.user_id,
      customerName: row.customer_name,
      customerEmail: row.customer_email,
      customerPhone: row.customer_phone,
      shippingAddress: {
        line1: row.shipping_address_line1,
        line2: row.shipping_address_line2,
        city: row.shipping_city,
        region: row.shipping_region,
        postalCode: row.shipping_postal_code,
        country: row.shipping_country
      },
      billingAddress: row.billing_same_as_shipping ? undefined : {
        line1: row.billing_address_line1,
        line2: row.billing_address_line2,
        city: row.billing_city,
        region: row.billing_region,
        postalCode: row.billing_postal_code,
        country: row.billing_country
      },
      billingSameAsShipping: row.billing_same_as_shipping,
      subtotal: parseFloat(row.subtotal),
      taxAmount: parseFloat(row.tax_amount),
      shippingCost: parseFloat(row.shipping_cost),
      discountAmount: parseFloat(row.discount_amount || '0'),
      totalAmount: parseFloat(row.total_amount),
      currency: row.currency,
      status: row.status,
      paymentStatus: row.payment_status,
      specialInstructions: row.special_instructions,
      deliveryNotes: row.delivery_notes,
      estimatedDeliveryDate: row.estimated_delivery_date,
      actualDeliveryDate: row.actual_delivery_date,
      paymentMethod: row.payment_method,
      paymentReference: row.payment_reference,
      paymentDate: row.payment_date,
      assignedContractorId: row.assigned_contractor_id,
      installationRequired: row.installation_required,
      installationDate: row.installation_date,
      installationStatus: row.installation_status,
      samaReferenceNumber: row.sama_reference_number,
      complianceVerified: row.compliance_verified,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      items: includeItems && row.items ? row.items.filter((item: any) => item !== null) : undefined
    };
  }
}

// Export singleton instance
export const orderService = new OrderService();