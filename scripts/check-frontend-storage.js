// This script should be run in the browser console
console.log('🔍 Checking Frontend Local Storage:');
console.log('Authentication tokens:');
console.log('  • rabhan_access_token:', localStorage.getItem('rabhan_access_token') ? 'EXISTS' : 'MISSING');
console.log('  • token:', localStorage.getItem('token') ? 'EXISTS' : 'MISSING');

// Check all storage items
console.log('\n📊 All localStorage items:');
for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    const value = localStorage.getItem(key);
    console.log(`  • ${key}:`, value ? (value.length > 50 ? value.substring(0, 50) + '...' : value) : 'empty');
}

// Check if user is authenticated in auth service
if (window.authService) {
    console.log('\n👤 Auth Service Status:');
    console.log('  • Is Authenticated:', window.authService.isAuthenticated());
    console.log('  • Current User:', window.authService.getCurrentUser());
} else {
    console.log('\n❌ Auth Service not found on window object');
}