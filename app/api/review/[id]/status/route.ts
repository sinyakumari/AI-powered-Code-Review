import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAuth, unauthorizedResponse } from '@/middleware/auth.middleware';
import { MESSAGES, STATUS_CODES, REVIEW_STATUS } from '@/lib/constants';

/**
 * PATCH /api/review/[id]/status
 * Updates the status of a specific review
 */
export async function PATCH(
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

    // 2. Parse and validate body
    const body = await req.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json(
        { success: false, message: MESSAGES.ERROR.REQUIRED_FIELDS },
        { status: STATUS_CODES.BAD_REQUEST }
      );
    }

    // 3. Validate status value is allowed
    const allowedStatuses = [REVIEW_STATUS.PENDING, REVIEW_STATUS.FIXED];
    if (!allowedStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, message: MESSAGES.ERROR.INVALID_STATUS }, // Generic error for invalid value if no specific message
        { status: STATUS_CODES.BAD_REQUEST }
      );
    }

    // 4. Verify review belongs to user
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

    // 5. Update review status in DB
    await query(
      'UPDATE reviews SET status = ? WHERE review_id = ?',
      [status, id]
    );

    // 6. Return response
    return NextResponse.json(
      {
        success: true,
        message: MESSAGES.SUCCESS.REVIEW_STATUS_UPDATED
      },
      { status: STATUS_CODES.OK }
    );
  } catch (error: any) {
    console.error('Update Review Status Error:', error.message);
    return NextResponse.json(
      { success: false, message: MESSAGES.ERROR.SERVER_ERROR },
      { status: STATUS_CODES.INTERNAL_SERVER_ERROR }
    );
  }
}
