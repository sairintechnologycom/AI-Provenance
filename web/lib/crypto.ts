import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const KEY = crypto.scryptSync(process.env.ENCRYPTION_SECRET || 'default-secret-do-not-use-in-prod', process.env.ENCRYPTION_SALT || 'salt', 32);

export function encrypt(text: string | null | undefined): string | null | undefined {
  if (!text) return text;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function decrypt(data: string | null | undefined): string | null | undefined {
  if (!data) return data;
  try {
    const buffer = Buffer.from(data, 'base64');
    const iv = buffer.slice(0, IV_LENGTH);
    const tag = buffer.slice(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const encrypted = buffer.slice(IV_LENGTH + TAG_LENGTH);
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(tag);
    return decipher.update(encrypted) + decipher.final('utf8');
  } catch (e) {
    // If decryption fails, it might be legacy plain text
    return data;
  }
}
