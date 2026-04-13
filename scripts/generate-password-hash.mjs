import { hashPassword } from '../lib/auth-utils.js';

const password = process.argv[2] || '';

if (!password) {
  console.error('Usage: node scripts/generate-password-hash.mjs "<password>"');
  process.exit(1);
}

const hashedPassword = await hashPassword(password);
console.log(hashedPassword);
