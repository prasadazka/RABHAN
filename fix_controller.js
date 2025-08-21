const fs = require('fs');

// Read the controller file
const filePath = '/opt/rabhan/backend/services/user-service/src/controllers/user.controller.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Fix the main issues systematically
content = content.replace(
  /return ResponseUtils\.created\(res, profile, 'Profile created successfully'\);/g,
  'return ResponseUtils.created(res, profile, \'Profile created successfully\');'
);

// Add missing return statements to all controller methods
content = content.replace(
  /res\.status\(StatusCodes\.(OK|CREATED)\)\.json\(response\);(\s+})(\s+catch)/g,
  'return res.status(StatusCodes.$1).json(response);$2$3'
);

// Fix the parameter issues with undefined types
content = content.replace(
  /req\.ip,\s+req\.headers\['user-agent'\]/g,
  'req.ip || \'\', req.headers[\'user-agent\'] || \'\''
);

content = content.replace(
  /authToken\);\s*$/m,
  'authToken || \'\');'
);

// Write the fixed content back
fs.writeFileSync(filePath, content);
console.log('Controller fixed!');