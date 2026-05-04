import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { MESSAGES, STATUS_CODES } from '@/lib/constants';
import { verifyAuth, unauthorizedResponse } from '@/middleware/auth.middleware';

/**
 * GET /api/profile
 * Fetches user profile data
 */
export async function GET(req: NextRequest) {
  try {
    const user = verifyAuth(req);
    if (!user) return unauthorizedResponse();

    const sql = `
      SELECT 
        user_id, name, username, email,
        bio, location, timezone,
        currently_working_on, avatar_url,
        github_id, google_id, created_at
      FROM users
      WHERE user_id = ?
    `;
    const users: any[] = await query(sql, [user.user_id]);

    if (users.length === 0) {
      return NextResponse.json(
        { success: false, message: MESSAGES.ERROR.PROFILE_NOT_FOUND },
        { status: STATUS_CODES.NOT_FOUND }
      );
    }

    return NextResponse.json(
      {
        success: true,
        user: users[0]
      },
      { status: STATUS_CODES.OK }
    );

  } catch (error: any) {
    console.error('Profile GET Error:', error.message);
    return NextResponse.json(
      { success: false, message: MESSAGES.ERROR.SERVER_ERROR },
      { status: STATUS_CODES.INTERNAL_SERVER_ERROR }
    );
  }
}

/**
 * PUT /api/profile
 * Updates user profile data
 */
export async function PUT(req: NextRequest) {
  try {
    const user = verifyAuth(req);
    if (!user) return unauthorizedResponse();

    const body = await req.json();
    const { name, username, bio, location, timezone, currently_working_on, avatar_url } = body;

    // Validation
    if (!name) {
      return NextResponse.json(
        { success: false, message: MESSAGES.ERROR.REQUIRED_FIELDS },
        { status: STATUS_CODES.BAD_REQUEST }
      );
    }

    if (username && username.length > 50) {
      return NextResponse.json(
        { success: false, message: 'Username must be 50 characters or less' },
        { status: STATUS_CODES.BAD_REQUEST }
      );
    }

    const sql = `
      UPDATE users 
      SET 
        name = ?, 
        username = ?, 
        bio = ?, 
        location = ?, 
        timezone = ?, 
        currently_working_on = ?, 
        avatar_url = ? 
      WHERE user_id = ?
    `;
    
    await query(sql, [
      name, 
      username || null, 
      bio || null, 
      location || null, 
      timezone || null, 
      currently_working_on || null, 
      avatar_url || null, 
      user.user_id
    ]);

    return NextResponse.json(
      {
        success: true,
        message: MESSAGES.SUCCESS.PROFILE_UPDATED
      },
      { status: STATUS_CODES.OK }
    );

  } catch (error: any) {
    console.error('Profile PUT Error:', error.message);
    return NextResponse.json(
      { success: false, message: MESSAGES.ERROR.PROFILE_UPDATE_FAILED },
      { status: STATUS_CODES.INTERNAL_SERVER_ERROR }
    );
  }
}
