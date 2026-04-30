import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, unauthorizedResponse } from '@/middleware/auth.middleware';
import { query } from '@/lib/db';
import { MESSAGES, STATUS_CODES, REVIEW_STATUS, SUGGESTION_STATUS } from '@/lib/constants';

/**
 * POST /api/review/[id]/suggestions/[suggestionId]/accept
 * Accept a specific suggestion and reject others
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

    // 2. Update the accepted suggestion
    await query(
      'UPDATE suggestions SET is_accepted = 1, status = ? WHERE suggestion_id = ? AND review_id = ?',
      [SUGGESTION_STATUS.ACCEPTED, suggestionId, id]
    );

    // 3. Update review status based on all suggestions
    const suggestions: any[] = await query(
      'SELECT is_accepted, status FROM suggestions WHERE review_id = ?',
      [id]
    );

    const hasAccepted = suggestions.some((s: any) => s.is_accepted === 1 || s.status === SUGGESTION_STATUS.ACCEPTED);
    const allRejected = suggestions.length > 0 && suggestions.every((s: any) => s.status === SUGGESTION_STATUS.REJECTED);

    let reviewStatus = REVIEW_STATUS.PENDING;
    if (hasAccepted) {
      reviewStatus = REVIEW_STATUS.FIXED;
    } else if (allRejected) {
      reviewStatus = REVIEW_STATUS.PENDING;
    }

    await query(
      'UPDATE reviews SET status = ? WHERE review_id = ?',
      [reviewStatus, id]
    );

    return NextResponse.json({
      success: true,
      message: MESSAGES.SUCCESS.SUGGESTION_ACCEPTED
    }, { status: STATUS_CODES.OK });

  } catch (error: any) {
    console.error('Accept Suggestion API Error:', error.message);
    return NextResponse.json(
      { success: false, message: MESSAGES.ERROR.SERVER_ERROR },
      { status: STATUS_CODES.INTERNAL_SERVER_ERROR }
    );
  }
}
