import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAuth, unauthorizedResponse } from '@/middleware/auth.middleware';
import { MESSAGES, STATUS_CODES } from '@/lib/constants';

/**
 * GET /api/reviews
 * Fetches all suggestions as individual "Review" items for the history page
 */
export async function GET(req: NextRequest) {
  try {
    const user = verifyAuth(req);
    if (!user) return unauthorizedResponse();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const language = searchParams.get('language');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '8');
    const offset = (page - 1) * limit;

    let baseSql = `
      FROM suggestions s
      JOIN reviews r ON s.review_id = r.review_id
      WHERE r.user_id = ?
    `;
    const params: any[] = [user.user_id];

    if (status && status !== 'all') {
      baseSql += ` AND LOWER(s.status) = LOWER(?)`;
      params.push(status);
    }

    if (language && language !== 'all') {
      baseSql += ` AND LOWER(r.language) = LOWER(?)`;
      params.push(language);
    }

    // Get total count
    const countResult = await query<any[]>(`SELECT COUNT(*) as count ${baseSql}`, params);
    const totalItems = countResult[0]?.count || 0;

    // Get suggestions with review metadata
    const dataSql = `
      SELECT 
        s.suggestion_id as review_id,
        s.review_id as parent_review_id,
        s.suggestion,
        s.severity,
        s.status,
        s.created_at,
        r.language,
        r.source,
        1 as total_bugs,
        IF(s.status = 'accepted', 1, 0) as accepted_bugs,
        IF(s.status = 'rejected', 1, 0) as rejected_bugs,
        IF(s.status = 'pending', 1, 0) as pending_bugs
      ${baseSql}
      ORDER BY s.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    
    const reviews = await query<any[]>(dataSql, params);

    return NextResponse.json({
      success: true,
      reviews,
      pagination: {
        total: totalItems,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
        limit
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
