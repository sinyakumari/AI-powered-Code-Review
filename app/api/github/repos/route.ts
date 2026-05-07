import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, unauthorizedResponse } from '@/middleware/auth.middleware';
import { MESSAGES, STATUS_CODES } from '@/lib/constants';

export async function GET(req: NextRequest) {
  try {
    // Verify JWT Auth
    const user = verifyAuth(req);
    if (!user) {
      return unauthorizedResponse();
    }

    const githubToken = req.headers.get('x-github-token');
    
    if (!githubToken) {
      console.error('GitHub Repos API: Missing x-github-token header');
      return NextResponse.json(
        { success: false, message: 'GitHub authentication token is missing. Please reconnect your account.' },
        { status: STATUS_CODES.BAD_REQUEST }
      );
    }

    const response = await fetch('https://api.github.com/user/repos?sort=updated&per_page=100', {
      headers: {
        Authorization: `token ${githubToken}`, // GitHub specifically prefers 'token' or 'Bearer'
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'CodeRefine-AI-App' // GitHub API requires a User-Agent header
      },
    });

    if (!response.ok) {
      const ghError = await response.json().catch(() => ({}));
      console.error('GitHub API Response Error:', {
        status: response.status,
        statusText: response.statusText,
        error: ghError
      });
      
      const errorMessage = ghError.message || 'GitHub API rejected the request.';
      return NextResponse.json(
        { success: false, message: `GitHub Error: ${errorMessage}` },
        { status: response.status === 401 ? STATUS_CODES.UNAUTHORIZED : response.status }
      );
    }

    const data = await response.json();

    const repos = data.map((repo: any) => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      private: repo.private,
      language: repo.language,
      updated_at: repo.updated_at,
      description: repo.description,
      owner: {
        login: repo.owner.login,
      },
      html_url: repo.html_url,
    }));

    return NextResponse.json(
      { success: true, repos },
      { status: STATUS_CODES.OK }
    );
  } catch (error: any) {
    console.error('GitHub Repos API Error:', error.message);
    return NextResponse.json(
      { success: false, message: MESSAGES.ERROR.SERVER_ERROR },
      { status: STATUS_CODES.INTERNAL_SERVER_ERROR }
    );
  }
}
