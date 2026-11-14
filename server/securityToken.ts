import crypto from 'node:crypto';

export interface SignedPlaybackPayload {
  sessionId: string;
  studentId: string;
  courseId: string;
  videoId: string;
  exp: number; // Unix timestamp in ms
}

export function signPlaybackToken(
  payload: Omit<SignedPlaybackPayload, 'exp'>,
  secret: string,
  ttlSeconds: number = 180
): { token: string; expiresAt: number } {
  const expiresAt = Date.now() + ttlSeconds * 1000;
  const fullPayload: SignedPlaybackPayload = {
    ...payload,
    exp: expiresAt,
  };
  const encoded = Buffer.from(JSON.stringify(fullPayload), 'utf8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', secret)
    .update(encoded)
    .digest('base64url');

  return {
    token: `${encoded}.${sig}`,
    expiresAt,
  };
}

export function verifyPlaybackToken(
  token: string,
  secret: string,
  nowMs: number = Date.now()
): { valid: true; payload: SignedPlaybackPayload } | { valid: false; reason: 'MALFORMED' | 'INVALID_SIGNATURE' | 'EXPIRED' } {
  if (!token || !token.includes('.')) {
    return { valid: false, reason: 'MALFORMED' };
  }
  const [encoded, sig] = token.split('.');
  if (!encoded || !sig) {
    return { valid: false, reason: 'MALFORMED' };
  }

  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(encoded)
    .digest('base64url');

  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return { valid: false, reason: 'INVALID_SIGNATURE' };
  }

  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as SignedPlaybackPayload;
    if (!parsed.exp || nowMs > parsed.exp) {
      return { valid: false, reason: 'EXPIRED' };
    }
    return { valid: true, payload: parsed };
  } catch {
    return { valid: false, reason: 'MALFORMED' };
  }
}
