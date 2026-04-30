import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAuth, unauthorizedResponse } from '@/middleware/auth.middleware';
import { MESSAGES, STATUS_CODES } from '@/lib/constants';

/**
 * GET /api/review/history
 * Fetches review history for the authenticated user with optional filters
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Verify JWT token
    const user = verifyAuth(req);
    if (!user) {
      return unauthorizedResponse();
    }

    // 2. Get user_id from token
    const { user_id } = user;

    // 3. Get query parameters
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const language = searchParams.get('language');

    // 4. Build dynamic query
    let sql = `
      SELECT 
        s.suggestion_id,
        s.suggestion,
        s.severity,
        s.status,
        s.is_accepted,
        s.created_at,
        r.review_id,
        r.language
      FROM suggestions s
      JOIN reviews r ON s.review_id = r.review_id
      WHERE r.user_id = ?
    `;
    const params: any[] = [user_id];

    if (status) {
      sql += ` AND s.status = ?`;
      params.push(status);
    }

    if (language) {
      sql += ` AND r.language = ?`;
      params.push(language);
    }

    sql += ` ORDER BY s.created_at DESC`;

    // 5. Execute query
    const suggestions = await query<any[]>(sql, params);

    // 6. Return response
    return NextResponse.json(
      {
        success: true,
        suggestions,
        total: suggestions.length
      },
      { status: STATUS_CODES.OK }
    );
  } catch (error: any) {
    console.error('Fetch History Error:', error.message);
    return NextResponse.json(
      {
        success: false,
        message: MESSAGES.ERROR.HISTORY_FETCH_FAILED
      },
      { status: STATUS_CODES.INTERNAL_SERVER_ERROR }
    );
  }
}
