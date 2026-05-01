import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, unauthorizedResponse } from '@/middleware/auth.middleware';
import { query } from '@/lib/db';
import { reviewCode } from '@/lib/llm';
import { MESSAGES, STATUS_CODES, REVIEW_STATUS, SOURCE } from '@/lib/constants';

/**
 * POST /api/review
 * Submit code for AI review
 */
export async function POST(req: NextRequest) {
  const user = verifyAuth(req);
  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const { code, source } = await req.json();

    if (!code || !source) {
      return NextResponse.json(
        { success: false, message: MESSAGES.ERROR.REQUIRED_FIELDS },
        { status: STATUS_CODES.BAD_REQUEST }
      );
    }

    const validSources = [
      SOURCE.PASTE, 
      SOURCE.UPLOAD, 
      SOURCE.GITHUB
    ];
    if (!validSources.includes(source)) {
      return NextResponse.json(
        { success: false, message: MESSAGES.ERROR.INVALID_SOURCE },
        { status: STATUS_CODES.BAD_REQUEST }
      );
    }

    // 1. Save initial review to DB (pending)
    console.time('DB_INITIAL_SAVE');
    const reviewResult: any = await query(
      'INSERT INTO reviews (user_id, code, source, status) VALUES (?, ?, ?, ?)',
      [user.user_id, code, source, REVIEW_STATUS.PENDING]
    );
    const reviewId = reviewResult.insertId;
    console.timeEnd('DB_INITIAL_SAVE');

    // 2. Send code to OpenAI for review
    console.time('AI_REVIEW_CALL');
    const aiResponse = await reviewCode(code);
    console.timeEnd('AI_REVIEW_CALL');

    // 3. Update review with AI results
    console.time('DB_UPDATE_FINAL');
    await query(
      'UPDATE reviews SET language = ?, ai_reviewed_code = ?, status = ? WHERE review_id = ?',
      [aiResponse.language, aiResponse.ai_reviewed_code, REVIEW_STATUS.FIXED, reviewId]
    );

    // 4. Save suggestions/bugs to DB
    if (aiResponse.bugs && aiResponse.bugs.length > 0) {
      for (const bug of aiResponse.bugs) {
        await query(
          'INSERT INTO suggestions (review_id, suggestion, severity, original_snippet, suggested_code, line_number) VALUES (?, ?, ?, ?, ?, ?)',
          [reviewId, bug.description, bug.severity, bug.original_snippet, bug.suggested_code, bug.line_number]
        );
      }
    }
    console.timeEnd('DB_UPDATE_FINAL');

    return NextResponse.json({
      success: true,
      review_id: reviewId,
      language: aiResponse.language,
      ai_reviewed_code: aiResponse.ai_reviewed_code,
      suggestions: aiResponse.bugs
    }, { status: STATUS_CODES.CREATED });

  } catch (error: any) {
    console.error('Code Review API Error FULL:', error);
    console.error('Error Stack:', error.stack);
    return NextResponse.json(
      { 
        success: false, 
        message: MESSAGES.ERROR.SERVER_ERROR,
        details: error.message 
      },
      { status: STATUS_CODES.INTERNAL_SERVER_ERROR }
    );
  }
}
