import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, unauthorizedResponse } from '@/middleware/auth.middleware';
import { query } from '@/lib/db';
import { MESSAGES, STATUS_CODES } from '@/lib/constants';

/**
 * GET /api/review/[id]/diff
 * Fetch review details and all suggestions for comparison
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = verifyAuth(req);
  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const { id } = await params;

    // 1. Get review and verify ownership
    const reviews: any[] = await query(
      'SELECT review_id, code as original_code, ai_reviewed_code, language, status, source, created_at FROM reviews WHERE review_id = ? AND user_id = ?',
      [id, user.user_id]
    );

    if (reviews.length === 0) {
      return NextResponse.json(
        { success: false, message: MESSAGES.ERROR.REVIEW_NOT_FOUND },
        { status: STATUS_CODES.NOT_FOUND }
      );
    }

    const review = reviews[0];

    // 2. Get all suggestions ordered by created_at
    const suggestions: any[] = await query(
      'SELECT suggestion_id, suggestion, severity, suggested_code, is_accepted, status, created_at FROM suggestions WHERE review_id = ? ORDER BY created_at ASC',
      [id]
    );

    return NextResponse.json({
      success: true,
      review: {
        review_id: review.review_id,
        original_code: review.original_code,
        ai_reviewed_code: review.ai_reviewed_code,
        language: review.language,
        status: review.status,
        source: review.source,
        created_at: review.created_at
      },
      suggestions,
      total_suggestions: suggestions.length
    }, { status: STATUS_CODES.OK });

  } catch (error: any) {
    console.error('Diff View API Error:', error.message);
    return NextResponse.json(
      { success: false, message: MESSAGES.ERROR.SERVER_ERROR },
      { status: STATUS_CODES.INTERNAL_SERVER_ERROR }
    );
  }
}
