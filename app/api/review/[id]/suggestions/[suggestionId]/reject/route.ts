import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, unauthorizedResponse } from '@/middleware/auth.middleware';
import { query } from '@/lib/db';
import { MESSAGES, STATUS_CODES, REVIEW_STATUS, SUGGESTION_STATUS } from '@/lib/constants';

/**
 * POST /api/review/[id]/suggestions/[suggestionId]/reject
 * Reject a specific suggestion
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string, suggestionId: string }> }
) {
  const user = verifyAuth(req);
  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const { id, suggestionId } = await params;

    // 1. Verify review belongs to user
    const reviews: any[] = await query(
      'SELECT review_id FROM reviews WHERE review_id = ? AND user_id = ?',
      [id, user.user_id]
    );

    if (reviews.length === 0) {
      return NextResponse.json(
        { success: false, message: MESSAGES.ERROR.REVIEW_NOT_FOUND },
        { status: STATUS_CODES.NOT_FOUND }
      );
    }

    // 2. Update the rejected suggestion
    await query(
      'UPDATE suggestions SET is_accepted = 0, status = ? WHERE suggestion_id = ? AND review_id = ?',
      [SUGGESTION_STATUS.REJECTED, suggestionId, id]
    );

    // 3. Check if all suggestions for this review are rejected
    const remaining: any[] = await query(
      'SELECT COUNT(*) as count FROM suggestions WHERE review_id = ? AND status != ?',
      [id, SUGGESTION_STATUS.REJECTED]
    );
    
    const allRejected = remaining[0].count === 0;

    // 4. If all rejected, reset review status to pending
    if (allRejected) {
      await query(
        'UPDATE reviews SET status = ? WHERE review_id = ?',
        [REVIEW_STATUS.PENDING, id]
      );
    }

    return NextResponse.json({
      success: true,
      message: MESSAGES.SUCCESS.SUGGESTION_REJECTED,
      all_rejected: allRejected
    }, { status: STATUS_CODES.OK });

  } catch (error: any) {
    console.error('Reject Suggestion API Error:', error.message);
    return NextResponse.json(
      { success: false, message: MESSAGES.ERROR.SERVER_ERROR },
      { status: STATUS_CODES.INTERNAL_SERVER_ERROR }
    );
  }
}
