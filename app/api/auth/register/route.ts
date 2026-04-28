import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { MESSAGES, STATUS_CODES, AUTH } from '@/lib/constants';

/**
 * POST /api/auth/register
 * Handles user registration
 */
export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();

    // 1. Validate required fields
    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, message: MESSAGES.ERROR.REQUIRED_FIELDS },
        { status: STATUS_CODES.BAD_REQUEST }
      );
    }

    // 2. Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, message: MESSAGES.ERROR.INVALID_EMAIL },
        { status: STATUS_CODES.BAD_REQUEST }
      );
    }

    // 3. Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { success: false, message: MESSAGES.ERROR.PASSWORD_MIN_LENGTH },
        { status: STATUS_CODES.BAD_REQUEST }
      );
    }

    // 4. Hash password
    const hashedPassword = await bcrypt.hash(password, AUTH.BCRYPT_SALT_ROUNDS);

    // 5. Save to users table
    try {
      const sql = 'INSERT INTO users (name, email, password) VALUES (?, ?, ?)';
      const result: any = await query(sql, [name, email, hashedPassword]);

      return NextResponse.json(
        { 
          success: true,
          message: MESSAGES.SUCCESS.REGISTERED, 
          user_id: result.insertId 
        },
        { status: STATUS_CODES.CREATED }
      );
    } catch (error: any) {
      // Handle duplicate email error
      if (error.code === 'ER_DUP_ENTRY') {
        return NextResponse.json(
          { success: false, message: MESSAGES.ERROR.EMAIL_ALREADY_EXISTS },
          { status: STATUS_CODES.CONFLICT }
        );
      }
      throw error;
    }
  } catch (error: any) {
    console.error('Registration API Error:', error);
    return NextResponse.json(
      { success: false, message: MESSAGES.ERROR.SERVER_ERROR },
      { status: STATUS_CODES.INTERNAL_SERVER_ERROR }
    );
  }
}
