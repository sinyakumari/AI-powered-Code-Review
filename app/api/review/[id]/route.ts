import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAuth, unauthorizedResponse } from '@/middleware/auth.middleware';
import { MESSAGES, STATUS_CODES } from '@/lib/constants';

/**
 * GET /api/review/[id]
 * Fetches details and suggestions for a specific review
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Verify JWT token
    const user = verifyAuth(req);
    if (!user) {
      return unauthorizedResponse();
    }

    const { id } = await params;
    const { user_id } = user;

    // 2. Get review by review_id AND user_id (security)
    const reviewResult = await query<any[]>(
      'SELECT review_id, code as original_code, ai_reviewed_code, language, status, source, created_at FROM reviews WHERE review_id = ? AND user_id = ?',
      [id, user_id]
    );

    if (reviewResult.length === 0) {
      return NextResponse.json(
        { success: false, message: MESSAGES.ERROR.REVIEW_NOT_FOUND },
        { status: STATUS_CODES.NOT_FOUND }
      );
    }

    const review = reviewResult[0];

    // 3. Get ALL suggestions for this review
    const suggestions = await query<any[]>(
      'SELECT suggestion_id, suggestion, severity, suggested_code, is_accepted, status, created_at FROM suggestions WHERE review_id = ? ORDER BY created_at ASC',
      [id]
    );

    // 4. Return response
    return NextResponse.json(
      {
        success: true,
        review,
        suggestions,
        total_suggestions: suggestions.length
      },
      { status: STATUS_CODES.OK }
    );
  } catch (error: any) {
    console.error('Fetch Review Details Error:', error.message);
    return NextResponse.json(
      { success: false, message: MESSAGES.ERROR.SERVER_ERROR },
      { status: STATUS_CODES.INTERNAL_SERVER_ERROR }
    );
  }
}

/**
 * DELETE /api/review/[id]
 * Deletes a specific review and all its suggestions
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Verify JWT token
    const user = verifyAuth(req);
    if (!user) {
      return unauthorizedResponse();
    }

    const { id } = await params;
    const { user_id } = user;

    // 2. Verify review belongs to user
    const reviewResult = await query<any[]>(
      'SELECT review_id FROM reviews WHERE review_id = ? AND user_id = ?',
      [id, user_id]
    );

    if (reviewResult.length === 0) {
      return NextResponse.json(
        { success: false, message: MESSAGES.ERROR.REVIEW_NOT_FOUND },
        { status: STATUS_CODES.NOT_FOUND }
      );
    }

    // 3. Delete all suggestions for this review first
    await query('DELETE FROM suggestions WHERE review_id = ?', [id]);

    // 4. Delete the review
    await query('DELETE FROM reviews WHERE review_id = ?', [id]);

    // 5. Return response
    return NextResponse.json(
      {
        success: true,
        message: MESSAGES.SUCCESS.REVIEW_DELETED
      },
      { status: STATUS_CODES.OK }
    );
  } catch (error: any) {
    console.error('Delete Review Error:', error.message);
    return NextResponse.json(
      { success: false, message: MESSAGES.ERROR.SERVER_ERROR },
      { status: STATUS_CODES.INTERNAL_SERVER_ERROR }
    );
  }
}
