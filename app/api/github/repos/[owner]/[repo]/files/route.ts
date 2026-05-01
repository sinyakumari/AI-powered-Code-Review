import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, unauthorizedResponse } from '@/middleware/auth.middleware';
import { MESSAGES, STATUS_CODES } from '@/lib/constants';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> }
) {
  try {
    // Verify JWT Auth
    const user = verifyAuth(req);
    if (!user) {
      return unauthorizedResponse();
    }

    const githubToken = req.headers.get('x-github-token');
    
    if (!githubToken) {
      return NextResponse.json(
        { success: false, message: MESSAGES.ERROR.GITHUB_TOKEN_FAILED },
        { status: STATUS_CODES.BAD_REQUEST }
      );
    }

    const { owner, repo } = await params;
    const path = req.nextUrl.searchParams.get('path') || '';

    const githubApiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

    const response = await fetch(githubApiUrl, {
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch files from GitHub');
    }

    const data = await response.json();
    
    // GitHub contents API can return an object for a single file or an array for a directory.
    // If it's not an array, wrap it in an array or return an empty array if invalid.
    const contents = Array.isArray(data) ? data : [data];

    // Filter out hidden files (starting with .)
    const visibleFiles = contents.filter((item: any) => !item.name.startsWith('.'));

    // Sort: directories first, then files, both alphabetically
    const sortedFiles = visibleFiles.sort((a: any, b: any) => {
      if (a.type === 'dir' && b.type === 'file') return -1;
      if (a.type === 'file' && b.type === 'dir') return 1;
      return a.name.localeCompare(b.name);
    });

    const files = sortedFiles.map((file: any) => ({
      name: file.name,
      path: file.path,
      type: file.type,
      size: file.size,
      download_url: file.download_url,
      sha: file.sha,
    }));

    return NextResponse.json(
      { success: true, files },
      { status: STATUS_CODES.OK }
    );
  } catch (error: any) {
    console.error('GitHub Repo Files API Error:', error.message);
    return NextResponse.json(
      { success: false, message: MESSAGES.ERROR.SERVER_ERROR },
      { status: STATUS_CODES.INTERNAL_SERVER_ERROR }
    );
  }
}
