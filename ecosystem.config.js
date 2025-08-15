module.exports = {
  apps: [
    {
      name: 'rabhan-frontend',
      script: 'npm',
      args: 'run preview',
      cwd: './frontend/rabhan-web',
      env: {
        PORT: 3000,
        NODE_ENV: 'production'
      }
    },
    {
      name: 'auth-service',
      script: 'dist/server.js',
      cwd: './backend/services/auth-service',
      env: {
        PORT: 3001,
        NODE_ENV: 'production',
        DATABASE_HOST: 'localhost',
        DATABASE_PORT: 5432,
        DATABASE_USER: 'rabhan_user',
        DATABASE_PASSWORD: '12345',
        DATABASE_NAME: 'rabhan_auth'
      }
    },
    {
      name: 'user-service',
      script: 'dist/server.js',
      cwd: './backend/services/user-service',
      env: {
        PORT: 3002,
        NODE_ENV: 'production',
        DATABASE_HOST: 'localhost',
        DATABASE_PORT: 5432,
        DATABASE_USER: 'rabhan_user',
        DATABASE_PASSWORD: '12345',
        DATABASE_NAME: 'rabhan_user'
      }
    },
    {
      name: 'document-service',
      script: 'dist/server.js',
      cwd: './backend/services/document-service',
      env: {
        PORT: 3003,
        NODE_ENV: 'production',
        DATABASE_HOST: 'localhost',
        DATABASE_PORT: 5432,
        DATABASE_USER: 'rabhan_user',
        DATABASE_PASSWORD: '12345',
        DATABASE_NAME: 'rabhan_document'
      }
    },
    {
      name: 'contractor-service',
      script: 'dist/server.js',
      cwd: './backend/services/contractor-service',
      env: {
        PORT: 3004,
        NODE_ENV: 'production',
        DATABASE_HOST: 'localhost',
        DATABASE_PORT: 5432,
        DATABASE_USER: 'rabhan_user',
        DATABASE_PASSWORD: '12345',
        DATABASE_NAME: 'rabhan_contractors'
      }
    },
    {
      name: 'solar-calculator-service',
      script: 'dist/server.js',
      cwd: './backend/services/solar-calculator-service',
      env: {
        PORT: 3005,
        NODE_ENV: 'production'
      }
    },
    {
      name: 'admin-service',
      script: 'dist/server.js',
      cwd: './backend/services/admin-service',
      env: {
        PORT: 3006,
        NODE_ENV: 'production',
        DATABASE_HOST: 'localhost',
        DATABASE_PORT: 5432,
        DATABASE_USER: 'rabhan_user',
        DATABASE_PASSWORD: '12345',
        DATABASE_NAME: 'rabhan_admin'
      }
    },
    {
      name: 'marketplace-service',
      script: 'server.js',
      cwd: './backend/services/marketplace-service',
      env: {
        PORT: 3007,
        NODE_ENV: 'production',
        DATABASE_HOST: 'localhost',
        DATABASE_PORT: 5432,
        DATABASE_USER: 'rabhan_user',
        DATABASE_PASSWORD: '12345',
        DATABASE_NAME: 'rabhan_marketplace'
      }
    },
    {
      name: 'document-proxy-service',
      script: 'dist/server.js',
      cwd: './backend/services/document-proxy-service',
      env: {
        PORT: 3008,
        NODE_ENV: 'production'
      }
    },
    {
      name: 'quote-service',
      script: 'production-server.js',
      cwd: './backend/services/quote-service',
      env: {
        PORT: 3009,
        NODE_ENV: 'production',
        DATABASE_HOST: 'localhost',
        DATABASE_PORT: 5432,
        DATABASE_USER: 'rabhan_user',
        DATABASE_PASSWORD: '12345',
        DATABASE_NAME: 'rabhan_quote'
      }
    }
  ]
};