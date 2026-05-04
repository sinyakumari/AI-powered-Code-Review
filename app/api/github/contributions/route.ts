import { NextRequest, NextResponse } from 'next/server';
import { MESSAGES, STATUS_CODES } from '@/lib/constants';
import { verifyAuth, unauthorizedResponse } from '@/middleware/auth.middleware';

/**
 * GET /api/github/contributions
 * Fetches contribution data (PushEvents) for the last 52 weeks
 */
export async function GET(req: NextRequest) {
  try {
    const user = verifyAuth(req);
    if (!user) return unauthorizedResponse();

    const githubToken = req.headers.get('x-github-token');
    if (!githubToken) {
      return NextResponse.json(
        { success: false, message: MESSAGES.ERROR.GITHUB_TOKEN_FAILED },
        { status: STATUS_CODES.BAD_REQUEST }
      );
    }

    // 1. Get GitHub username
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
    if (!userRes.ok) throw new Error('Failed to fetch GitHub user');
    const githubUser = await userRes.json();
    const username = githubUser.login;

    // 2. Fetch events (limit to last 100 as per instructions)
    const eventsRes = await fetch(`https://api.github.com/users/${username}/events?per_page=100`, {
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
    if (!eventsRes.ok) throw new Error('Failed to fetch GitHub events');
    const events = await eventsRes.json();

    // 3. Initialize contribution map for the last 52 weeks (364 days)
    const contributionsMap: { [date: string]: number } = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 364; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      contributionsMap[dateStr] = 0;
    }

    // 4. Count PushEvents
    let total = 0;
    events.forEach((event: any) => {
      if (event.type === 'PushEvent') {
        const dateStr = event.created_at.split('T')[0];
        if (contributionsMap.hasOwnProperty(dateStr)) {
          contributionsMap[dateStr] += 1;
          total += 1;
        }
      }
    });

    // 5. Convert map to sorted array
    const contributions = Object.entries(contributionsMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json(
      {
        success: true,
        contributions,
        total,
      },
      { status: STATUS_CODES.OK }
    );

  } catch (error: any) {
    console.error('GitHub Contributions API Error:', error.message);
    return NextResponse.json(
      { success: false, message: MESSAGES.ERROR.GITHUB_FETCH_FAILED },
      { status: STATUS_CODES.INTERNAL_SERVER_ERROR }
    );
  }
}
