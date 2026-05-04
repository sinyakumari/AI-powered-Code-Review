import { NextRequest, NextResponse } from 'next/server';
import { MESSAGES, STATUS_CODES } from '@/lib/constants';
import { verifyAuth, unauthorizedResponse } from '@/middleware/auth.middleware';

/**
 * GET /api/github/languages
 * Fetches top 5 languages from user's GitHub repositories
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

    // 1. Fetch user repositories (limit to 20 for performance)
    const reposResponse = await fetch('https://api.github.com/user/repos?per_page=20&sort=updated', {
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!reposResponse.ok) {
      throw new Error('Failed to fetch repositories from GitHub');
    }

    const repos = await reposResponse.json();
    const languageMap: { [key: string]: number } = {};
    let totalBytes = 0;

    // 2. Fetch languages for each repository
    const languagePromises = repos.map(async (repo: any) => {
      try {
        const langResponse = await fetch(repo.languages_url, {
          headers: {
            Authorization: `Bearer ${githubToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        });
        if (langResponse.ok) {
          return await langResponse.json();
        }
      } catch (err) {
        console.error(`Error fetching languages for ${repo.name}:`, err);
      }
      return {};
    });

    const languagesResults = await Promise.all(languagePromises);

    // 3. Merge byte counts
    languagesResults.forEach((repoLangs) => {
      for (const [lang, bytes] of Object.entries(repoLangs)) {
        const byteCount = bytes as number;
        languageMap[lang] = (languageMap[lang] || 0) + byteCount;
        totalBytes += byteCount;
      }
    });

    // 4. Calculate percentages and sort
    const languages = Object.entries(languageMap)
      .map(([name, bytes]) => ({
        name,
        percentage: totalBytes > 0 ? Math.round((bytes / totalBytes) * 100) : 0,
      }))
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 3);

    return NextResponse.json(
      {
        success: true,
        languages,
      },
      { status: STATUS_CODES.OK }
    );

  } catch (error: any) {
    console.error('GitHub Languages API Error:', error.message);
    return NextResponse.json(
      { success: false, message: MESSAGES.ERROR.GITHUB_FETCH_FAILED },
      { status: STATUS_CODES.INTERNAL_SERVER_ERROR }
    );
  }
}
