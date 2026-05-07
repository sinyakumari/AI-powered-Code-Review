import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  try {
    const clientId = process.env.GITHUB_CLIENT_ID;
    
    const host = req.headers.get('host');
    const protocol = host?.includes('localhost') ? 'http' : 'https';
    const dynamicRedirectUri = `${protocol}://${host}/api/auth/github/login/callback`;

    if (!clientId) {
      throw new Error('GitHub Client ID is not configured');
    }

    const state = 'github_login_' + 
      Math.random().toString(36).substring(7);

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: dynamicRedirectUri,
      scope: 'user:email read:user',
      state: state,
    });

    const githubAuthUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;

    const response = NextResponse.redirect(githubAuthUrl);

    // Set state in cookie for verification in callback
    response.cookies.set('github_oauth_state', state, {
      httpOnly: true,
      maxAge: 600,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('GitHub Login API Error:', error);
    return NextResponse.redirect(new URL('/login?error=github_failed', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
  }
}
