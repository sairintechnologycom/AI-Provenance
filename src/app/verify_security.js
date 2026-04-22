import crypto from 'crypto';

function timingSafeEqual(a, b) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

const secret = 'my-secret-key';
console.log('Match (correct):', timingSafeEqual(secret, 'my-secret-key'));
console.log('Match (wrong):', timingSafeEqual(secret, 'wrong-key'));
console.log('Match (different length):', timingSafeEqual(secret, 'short'));

// Test encryption with salt
const ENCRYPTION_SECRET = 'test-secret';
const ENCRYPTION_SALT = 'test-salt';

const key1 = crypto.scryptSync(ENCRYPTION_SECRET, ENCRYPTION_SALT, 32);
const key2 = crypto.scryptSync(ENCRYPTION_SECRET, 'other-salt', 32);

console.log('Keys are different with different salts:', !key1.equals(key2));
