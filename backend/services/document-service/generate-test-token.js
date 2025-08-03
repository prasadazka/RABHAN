const jwt = require('jsonwebtoken');

const jwtSecret = process.env.JWT_SECRET || 'rabhan_jwt_secret_key_for_development_only_change_in_production';
const userId = '1f475729-c2e0-4b3d-a678-e4a4ea4d6cc0';

const payload = {
  userId: userId,
  email: 'test@example.com',
  type: 'USER',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
};

const token = jwt.sign(payload, jwtSecret);
console.log('Generated test token:');
console.log(token);
EOF < /dev/null
