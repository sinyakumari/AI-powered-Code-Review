import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAuth, unauthorizedResponse } from '@/middleware/auth.middleware';
import { MESSAGES, STATUS_CODES } from '@/lib/constants';

/**
 * DELETE /api/suggestion/[id]
 * Deletes a single suggestion while keeping other suggestions in the review session
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = verifyAuth(req);
    if (!user) return unauthorizedResponse();

    const { id } = await params;
    const suggestionId = parseInt(id);
    const userId = user.user_id;

    if (isNaN(suggestionId)) {
      return NextResponse.json({ success: false, message: 'Invalid ID' }, { status: 400 });
    }
    
    // Check if the suggestion belongs to a review owned by the user
    const checkSql = `
      SELECT s.suggestion_id 
      FROM suggestions s
      INNER JOIN reviews r ON s.review_id = r.review_id
      WHERE s.suggestion_id = ? AND r.user_id = ?
    `;
    const checkResult = await query<any[]>(checkSql, [suggestionId, userId]);

    if (!checkResult || checkResult.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Suggestion not found or unauthorized' },
        { status: 404 }
      );
    }

    // Delete only this specific suggestion
    await query('DELETE FROM suggestions WHERE suggestion_id = ?', [suggestionId]);

    return NextResponse.json({
      success: true,
      message: 'Suggestion deleted successfully'
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
