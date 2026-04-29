import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, unauthorizedResponse } from '@/middleware/auth.middleware';
import { query } from '@/lib/db';
import { MESSAGES, STATUS_CODES } from '@/lib/constants';

/**
 * GET /api/review/[id]
 * Fetch review details and suggestions
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

    // 1. Get review from DB
    const reviews: any[] = await query(
      'SELECT * FROM reviews WHERE review_id = ? AND user_id = ?',
      [id, user.user_id]
    );

    if (reviews.length === 0) {
      return NextResponse.json(
        { success: false, message: MESSAGES.ERROR.REVIEW_NOT_FOUND },
        { status: STATUS_CODES.NOT_FOUND }
      );
    }

    const review = reviews[0];

    // 2. Get suggestions for the review
    const suggestions = await query(
      'SELECT * FROM suggestions WHERE review_id = ?',
      [id]
    );

    return NextResponse.json({
      success: true,
      review,
      suggestions
    }, { status: STATUS_CODES.OK });

  } catch (error: any) {
    console.error('Fetch Review API Error:', error.message);
    return NextResponse.json(
      { success: false, message: MESSAGES.ERROR.SERVER_ERROR },
      { status: STATUS_CODES.INTERNAL_SERVER_ERROR }
    );
  }
}
