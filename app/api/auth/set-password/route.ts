import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { verifyAuth, unauthorizedResponse } from '@/middleware/auth.middleware';
import { query } from '@/lib/db';
import { MESSAGES, STATUS_CODES, AUTH } from '@/lib/constants';

export async function POST(req: NextRequest) {
  const user = verifyAuth(req);
  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const { password } = await req.json();

    if (!password || password.length < 8) {
      return NextResponse.json(
        { success: false, message: MESSAGES.ERROR.PASSWORD_REQUIRED },
        { status: STATUS_CODES.BAD_REQUEST }
      );
    }

    const hashedPassword = await bcrypt.hash(password, AUTH.BCRYPT_SALT_ROUNDS);

    await query('UPDATE users SET password = ? WHERE user_id = ?', [hashedPassword, user.user_id]);

    return NextResponse.json(
      { success: true, message: MESSAGES.SUCCESS.PASSWORD_SET },
      { status: STATUS_CODES.OK }
    );

  } catch (error) {
    console.error('Set Password Error:', error);
    return NextResponse.json(
      { success: false, message: MESSAGES.ERROR.SERVER_ERROR },
      { status: STATUS_CODES.INTERNAL_SERVER_ERROR }
    );
  }
}
