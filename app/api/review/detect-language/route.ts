import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, unauthorizedResponse } from '@/middleware/auth.middleware';
import { detectLanguage } from '@/lib/llm';
import { MESSAGES, STATUS_CODES } from '@/lib/constants';

/**
 * POST /api/review/detect-language
 * Detect programming language of code snippet
 */
export async function POST(req: NextRequest) {
  const user = verifyAuth(req);
  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const { code } = await req.json();

    if (!code) {
      return NextResponse.json(
        { success: false, message: MESSAGES.ERROR.REQUIRED_FIELDS },
        { status: STATUS_CODES.BAD_REQUEST }
      );
    }

    const language = await detectLanguage(code);

    return NextResponse.json({
      success: true,
      language
    }, { status: STATUS_CODES.OK });

  } catch (error: any) {
    console.error('Language Detection API Error:', error.message);
    return NextResponse.json(
      { success: false, message: MESSAGES.ERROR.SERVER_ERROR },
      { status: STATUS_CODES.INTERNAL_SERVER_ERROR }
    );
  }
}
