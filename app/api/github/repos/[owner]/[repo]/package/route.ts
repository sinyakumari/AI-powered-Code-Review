import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, unauthorizedResponse } from '@/middleware/auth.middleware';
import { MESSAGES, STATUS_CODES } from '@/lib/constants';

/**
 * GET /api/github/repos/[owner]/[repo]/package
 * Fetches and parses package.json
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> }
) {
  const user = verifyAuth(req);
  if (!user) return unauthorizedResponse();

  const githubToken = req.headers.get('x-github-token');
  if (!githubToken) {
    return NextResponse.json(
      { success: false, message: MESSAGES.ERROR.GITHUB_TOKEN_FAILED },
      { status: STATUS_CODES.BAD_REQUEST }
    );
  }

  const { owner, repo } = await params;

  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/package.json`,
      {
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    );

    if (res.status === 404) {
      return NextResponse.json({ success: true, packageJson: null });
    }

    if (!res.ok) {
      throw new Error('Failed to fetch package.json from GitHub');
    }

    const data = await res.json();
    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    const pkg = JSON.parse(content);

    const result = {
      name: pkg.name,
      version: pkg.version,
      dependencies: pkg.dependencies ? Object.keys(pkg.dependencies) : [],
      devDependencies: pkg.devDependencies ? Object.keys(pkg.devDependencies) : [],
      scripts: pkg.scripts ? Object.keys(pkg.scripts) : [],
    };

    return NextResponse.json({
      success: true,
      packageJson: result,
      raw: content
    });

  } catch (error: any) {
    console.error('GitHub Package API Error:', error);
    return NextResponse.json(
      { success: false, message: MESSAGES.ERROR.GITHUB_PACKAGE_FAILED },
      { status: STATUS_CODES.INTERNAL_SERVER_ERROR }
    );
  }
}
