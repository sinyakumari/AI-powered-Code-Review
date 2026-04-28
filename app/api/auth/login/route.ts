import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '@/lib/db';
import { MESSAGES, STATUS_CODES, AUTH } from '@/lib/constants';

/**
 * POST /api/auth/login
 * Handles user login and JWT generation
 */
export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    // 1. Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: MESSAGES.ERROR.REQUIRED_FIELDS },
        { status: STATUS_CODES.BAD_REQUEST }
      );
    }

    // 2. Fetch user from DB
    const sql = 'SELECT user_id, name, email, password FROM users WHERE email = ?';
    const users: any[] = await query(sql, [email]);

    if (users.length === 0) {
      return NextResponse.json(
        { success: false, message: MESSAGES.ERROR.INVALID_CREDENTIALS },
        { status: STATUS_CODES.UNAUTHORIZED }
      );
    }

    const user = users[0];

    // 3. Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, message: MESSAGES.ERROR.INVALID_CREDENTIALS },
        { status: STATUS_CODES.UNAUTHORIZED }
      );
    }

    // 4. Generate JWT Token
    // ✅ Fix — throw error if JWT_SECRET is missing
    const secret = process.env.JWT_SECRET;
     if (!secret) throw new Error('JWT_SECRET is not defined');
    const token = jwt.sign(
      { 
        user_id: user.user_id, 
        email: user.email,
        name: user.name 
      },
      secret,
      { expiresIn: AUTH.JWT_EXPIRY }
    );

    // 5. Return success response
    return NextResponse.json(
      {
        success: true,
        message: MESSAGES.SUCCESS.LOGGED_IN,
        token,
        user: {
          user_id: user.user_id,
          name: user.name,
          email: user.email
        }
      },
      { status: STATUS_CODES.OK }
    );

  } catch (error: any) {
    console.error('Login API Error:', error);
    return NextResponse.json(
      { success: false, message: MESSAGES.ERROR.SERVER_ERROR },
      { status: STATUS_CODES.INTERNAL_SERVER_ERROR }
    );
  }
}
