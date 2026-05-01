import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET() {
  try {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const redirectUri = process.env.GITHUB_LOGIN_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      throw new Error('GitHub OAuth credentials are not fully configured');
    }

    const state = crypto.randomBytes(16).toString('hex');

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'user:email read:user',
      response_type: 'code',
      state: state,
      prompt: 'login',
    });

    const githubAuthUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;

    const response = NextResponse.redirect(githubAuthUrl);

    // Set state in cookie for verification in callback
    response.cookies.set('github_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 10, // 10 minutes
    });

    return response;
  } catch (error) {
    console.error('GitHub Login API Error:', error);
    return NextResponse.redirect(new URL('/login?error=github_failed', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
  }
}
