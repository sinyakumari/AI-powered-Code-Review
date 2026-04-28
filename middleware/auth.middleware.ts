import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { MESSAGES } from '@/lib/constants';

/**
 * Interface for Decoded JWT Payload
 */
export interface AuthUser {
  user_id: number;
  email: string;
  name: string;
}

/**
 * Verify JWT Token from Request Header
 * @param req - Next.js Request object
 * @returns Decoded user data or null if invalid
 */
export const verifyAuth = (req: NextRequest): AuthUser | null => {
  try {
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET is not defined');

    const decoded = jwt.verify(token, secret) as AuthUser;
    return decoded;
  } catch (error: any) {
    console.error('JWT Verification Error:', error.message);
    return null;
  }
};

/**
 * Error Helper for Unauthorized Access
 */
export const unauthorizedResponse = (message: string = MESSAGES.ERROR.UNAUTHORIZED) => {
  return new Response(JSON.stringify({ success: false, message }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
};
