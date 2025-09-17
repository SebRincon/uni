import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-here'
);

export interface TokenPayload {
  id: string;
  username: string;
  email: string;
  iat?: number;
  exp?: number;
}

export async function signToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): Promise<string> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secret);
  
  return token;
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    
    // Validate that the payload has the required fields
    if (
      typeof payload.id === 'string' &&
      typeof payload.username === 'string' &&
      typeof payload.email === 'string'
    ) {
      return payload as TokenPayload;
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

export async function getTokenFromRequest(request: NextRequest): Promise<string | null> {
  // Check Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Check cookies
  const cookieStore = cookies();
  const token = cookieStore.get('auth-token')?.value;
  
  return token || null;
}

export async function getCurrentUser(request: NextRequest): Promise<TokenPayload | null> {
  const token = await getTokenFromRequest(request);
  if (!token) return null;
  
  return verifyToken(token);
}

export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = cookies();
  cookieStore.set('auth-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  });
}

export async function removeAuthCookie(): Promise<void> {
  const cookieStore = cookies();
  cookieStore.delete('auth-token');
}

// Legacy exports for API routes (to be removed during migration)
export async function verifyJwtToken(token: string): Promise<TokenPayload | null> {
  return verifyToken(token);
}

export function getJwtSecretKey(): Uint8Array {
  return secret;
}