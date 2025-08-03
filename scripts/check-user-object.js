// Simple script to see what's in the user object being passed to ContractorProfile

console.log('From the logs, the user object contains:');
console.log('✅ id: 79f18d65-b180-400f-8668-36449bdef3dc');
console.log('✅ email: contractor.nasser.rashid1@business.com'); 
console.log('✅ phone: +966531948719');
console.log('✅ national_id: 2105604443');
console.log('✅ first_name: PRASAD RAO');
console.log('❓ business_name: ?');
console.log('❓ description: ?');
console.log('❓ address_line1: ?');
console.log('❓ city: ?');

console.log('\nThe user object is missing the contractor fields!');
console.log('This means the merge in ContractorApp is NOT working properly.');
console.log('\nThe user object should have all contractor fields merged in,');
console.log('but it only has basic user fields from the auth service.');

console.log('\nTHE REAL PROBLEM:');
console.log('ContractorApp.tsx is NOT properly merging contractor data with user data!');
console.log('The ContractorProfile is receiving incomplete data.');

process.exit(0);