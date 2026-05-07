import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

export async function GET(req: NextRequest) {
  try {
    // JWT verification removed because this endpoint is called directly via window.location.href
    // without an Authorization header. Initiating OAuth is safe to be public.


    const clientId = process.env.GITHUB_IMPORT_CLIENT_ID;
    
    const host = req.headers.get('host');
    const protocol = host?.includes('localhost') ? 'http' : 'https';
    const dynamicRedirectUri = `${protocol}://${host}/api/auth/github/callback`;

    if (!clientId) {
      throw new Error('GitHub OAuth credentials are not fully configured');
    }

    const state = crypto.randomBytes(16).toString('hex');

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: dynamicRedirectUri,
      scope: 'repo read:user',
      state: state,
    });

    const githubAuthUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;

    const response = NextResponse.redirect(githubAuthUrl);

    // Set state in cookie for verification in callback
    response.cookies.set('github_oauth_repo_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 10, // 10 minutes
    });

    return response;
  } catch (error) {
    console.error('GitHub Repo Auth API Error:', error);
    return NextResponse.redirect(new URL('/review?error=github_failed&tab=github', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
  }
}
