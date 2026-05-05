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
    const { code, source, github_context } = await req.json();

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
    const reviewResult: any = await query(
      'INSERT INTO reviews (user_id, code, source, status) VALUES (?, ?, ?, ?)',
      [user.user_id, code, source, REVIEW_STATUS.PENDING]
    );
    const reviewId = reviewResult.insertId;

    // 2. Send code to AI for review
    const aiResponse = await reviewCode(code, 'auto', github_context);

    // 3. Update review with AI results
    await query(
      'UPDATE reviews SET language = ?, ai_reviewed_code = ?, status = ? WHERE review_id = ?',
      [aiResponse.language, aiResponse.ai_reviewed_code, REVIEW_STATUS.FIXED, reviewId]
    );

    // 4. Save suggestions/bugs to DB
    if (aiResponse.bugs && aiResponse.bugs.length > 0) {
      for (const bug of aiResponse.bugs) {
        await query(
          'INSERT INTO suggestions (review_id, suggestion, severity, original_snippet, suggested_code, line_number) VALUES (?, ?, ?, ?, ?, ?)',
          [
            reviewId,
            bug.description || null,
            bug.severity || 'medium',
            bug.original_snippet ?? null,
            bug.suggested_code || null,
            bug.line_number ?? null
          ]
        );
      }
    }

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
