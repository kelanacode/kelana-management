// Simple Web Crypto SHA-256 for browser-compatible password hashing

export async function hashPassword(password: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function generateToken(length = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function generateSessionId(): string {
  return 'sess_' + generateToken(16);
}

// Generate a simple simulated JWT token with payload and signature
export function createMockJWT(payload: Record<string, any>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000) }));
  const signature = generateToken(16);
  return `${header}.${body}.${signature}`;
}

export function validatePasswordStrength(password: string): {
  valid: boolean;
  score: number;
  errors: string[];
} {
  const errors: string[] = [];
  let score = 0;

  if (password.length >= 8) score++;
  else errors.push('Minimal 8 karakter');

  if (/[A-Z]/.test(password)) score++;
  else errors.push('Minimal 1 huruf besar (A-Z)');

  if (/[a-z]/.test(password)) score++;
  else errors.push('Minimal 1 huruf kecil (a-z)');

  if (/[0-9]/.test(password)) score++;
  else errors.push('Minimal 1 angka (0-9)');

  if (/[^A-Za-z0-9]/.test(password)) score++;
  else errors.push('Minimal 1 simbol khusus (!@#$%^&*)');

  return {
    valid: errors.length === 0,
    score,
    errors,
  };
}
