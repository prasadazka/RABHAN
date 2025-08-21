  async register(data: ContractorRegisterRequest): Promise<AuthTokens> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const passwordValidation = PasswordUtils.validate(data.password);
      if (!passwordValidation.valid) {
        throw new Error(passwordValidation.errors.join(', '));
      }
      
      const passwordHash = await PasswordUtils.hash(data.password);
      const normalizedPhone = data.phone ? ValidationUtils.normalizeSaudiPhone(data.phone) : null;
      let phoneVerified = false;
      if (normalizedPhone) {
        const PhoneVerificationService = require('./phone-verification.service').PhoneVerificationService;
        const phoneVerificationService = new PhoneVerificationService();
        phoneVerified = await phoneVerificationService.isPhoneVerified(normalizedPhone);
        
        if (!phoneVerified && config.env === 'production') {
          throw new Error('Phone verification required before registration');
        }
      }
      
      // Create user record in users table - trigger will automatically create contractor record
      const createUserQuery = `
        INSERT INTO users (
          first_name, last_name, email, password_hash, phone, 
          provider, national_id, status, user_type, role,
          email_verified, phone_verified
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;
      
      const userResult = await client.query(createUserQuery, [
        data.first_name,
        data.last_name,
        data.email.toLowerCase(),
        passwordHash,
        normalizedPhone,
        AuthProvider.EMAIL,
        data.national_id,
        UserStatus.PENDING,
        'BUSINESS', // Always set as BUSINESS for contractors
        UserRole.CONTRACTOR,
        false,
        phoneVerified
      ]);
      
      const user = userResult.rows[0];
      
      // Update contractor record with provided business details
      if (data.company_name || data.cr_number || data.vat_number) {
        const updateContractorQuery = `
          UPDATE contractors 
          SET company_name = COALESCE($2, company_name),
              cr_number = $3,
              vat_number = $4,
              business_type = $5
          WHERE user_id = $1
        `;
        
        await client.query(updateContractorQuery, [
          user.id,
          data.company_name,
          data.cr_number,
          data.vat_number,
          data.user_type === 'BUSINESS' ? 'llc' : 'individual'
        ]);
      }
      
      const sessionId = uuidv4();
      const { accessToken, refreshToken, expiresIn } = JWTUtils.generateTokenPair(
        user.id,
        user.email,
        UserRole.CONTRACTOR,
        sessionId
      );
      
      // Create session using user_sessions table
      const createSessionQuery = `
        INSERT INTO user_sessions (id, user_id, refresh_token, expires_at)
        VALUES ($1, $2, $3, $4)
      `;
      
      const expiresAt = new Date(Date.now() + JWTUtils.getExpiresInMs(config.jwt.refreshTokenExpiresIn));
      await client.query(createSessionQuery, [sessionId, user.id, refreshToken, expiresAt]);
      
      await client.query('COMMIT');
      
      SAMALogger.logAuthEvent('CONTRACTOR_REGISTRATION', user.id, {
        role: UserRole.CONTRACTOR,
        provider: AuthProvider.EMAIL
      });
      
      // Cache user data for contractor authentication
      if (this.redis) {
        const key = `user:${user.id}`;
        await this.redis.setex(key, 3600, JSON.stringify(user));
      }
      
      return { 
        accessToken, 
        refreshToken, 
        expiresIn,
        user: {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          role: UserRole.CONTRACTOR,
          phone: user.phone,
          national_id: user.national_id,
          user_type: user.user_type,
          status: user.status,
          bnpl_eligible: false
        }
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      
      if (error instanceof Error) {
        if (error.message.includes('duplicate key value violates unique constraint')) {
          if (error.message.includes('users_email_key')) {
            throw new Error('Email already registered');
          }
          if (error.message.includes('users_national_id_key')) {
            throw new Error('National ID already registered');
          }
        }
      }
      
      logger.error('Contractor registration failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }