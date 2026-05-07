import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, unauthorizedResponse } from '@/middleware/auth.middleware';
import { query } from '@/lib/db';
import { MESSAGES, STATUS_CODES } from '@/lib/constants';
import Groq from 'groq-sdk';

let _groq: Groq | null = null;
function getGroq(): Groq {
  if (!_groq) {
    const apiKey = process.env.GROQ_API_KEY || 'MISSING_KEY';
    _groq = new Groq({ apiKey });
  }
  return _groq;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = verifyAuth(req);
  if (!user) return unauthorizedResponse();

  try {
    const { id } = await params;

    // 1. Get review
    const reviews: any[] = await query(
      'SELECT review_id, code as original_code, ai_reviewed_code, language, status, source FROM reviews WHERE review_id = ? AND user_id = ?',
      [id, user.user_id]
    );
    if (reviews.length === 0) {
      return NextResponse.json(
        { success: false, message: MESSAGES.ERROR.REVIEW_NOT_FOUND },
        { status: STATUS_CODES.NOT_FOUND }
      );
    }
    const review = reviews[0];

    // 2. Get accepted suggestions only
    const suggestions: any[] = await query(
      'SELECT * FROM suggestions WHERE review_id = ? AND status = ?',
      [id, 'accepted']
    );

    if (suggestions.length === 0) {
      return NextResponse.json({
        success: true,
        final_code: review.original_code,
        message: 'No accepted suggestions'
      });
    }

    // 3. Build prompt for AI to apply only accepted fixes
    const fixesList = suggestions.map((s, i) =>
      `Fix ${i + 1}: ${s.suggestion}\nCode to apply:\n${s.suggested_code}`
    ).join('\n\n');

    const prompt = `You are a code editor. Apply ONLY the following fixes to the original code.
Do not add any other changes. Return ONLY the complete fixed code with no explanations, no markdown, no backticks.

ORIGINAL CODE:
${review.original_code}

FIXES TO APPLY:
${fixesList}

Return ONLY the complete fixed code:`;

    // 4. Ask AI to apply fixes
    const response = await getGroq().chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 4000,
      temperature: 0.1,
    });

    let finalCode = response.choices[0].message.content || review.original_code;



    // Clean up any markdown backticks if AI added them
    finalCode = finalCode
      .replace(/^```[\w]*\n?/gm, '')
      .replace(/^```$/gm, '')
      .trim();

    return NextResponse.json({
      success: true,
      final_code: finalCode,
      applied_count: suggestions.length
    });

  } catch (error: any) {
    console.error('Final Code API Error:', error);
    return NextResponse.json(
      { success: false, message: MESSAGES.ERROR.SERVER_ERROR },
      { status: STATUS_CODES.INTERNAL_SERVER_ERROR }
    );
  }
}
