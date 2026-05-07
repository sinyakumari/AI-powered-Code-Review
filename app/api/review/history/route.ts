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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // 4. Build dynamic query for data
    let baseSql = `
      FROM suggestions s
      JOIN reviews r ON s.review_id = r.review_id
      WHERE r.user_id = ?
    `;
    const params: any[] = [user_id];

    if (status) {
      baseSql += ` AND LOWER(s.status) = LOWER(?)`;
      params.push(status);
    }

    if (language) {
      baseSql += ` AND LOWER(r.language) = LOWER(?)`;
      params.push(language);
    }

    // 5. Get total count for pagination
    const countSql = `SELECT COUNT(*) as count ${baseSql}`;
    const countResult = await query<any[]>(countSql, params);
    const totalItems = countResult[0]?.count || 0;
    const totalPages = Math.ceil(totalItems / limit);

    // 6. Get paginated data
    const dataSql = `
      SELECT 
        s.suggestion_id,
        s.suggestion,
        s.severity,
        s.status,
        s.is_accepted,
        s.created_at,
        r.review_id,
        r.language
      ${baseSql}
      ORDER BY s.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    
    const suggestions = await query<any[]>(dataSql, params);

    // 7. Return response
    return NextResponse.json(
      {
        success: true,
        suggestions,
        pagination: {
          total: totalItems,
          totalPages,
          currentPage: page,
          limit
        }
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
