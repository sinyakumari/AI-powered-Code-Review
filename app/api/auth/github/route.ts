import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

export async function GET(req: NextRequest) {
  try {
    // Attempt to verify auth (header or query param)
    const authHeader = req.headers.get('Authorization');
    const queryToken = req.nextUrl.searchParams.get('token');
    
    let token = '';
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (queryToken) {
      token = queryToken;
    }

    if (!token) {
      throw new Error('Unauthorized');
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET is not defined');

    jwt.verify(token, secret);

    const clientId = process.env.GITHUB_IMPORT_CLIENT_ID;
    const redirectUri = process.env.GITHUB_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      throw new Error('GitHub OAuth credentials are not fully configured');
    }

    const state = crypto.randomBytes(16).toString('hex');

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'repo read:user',
      response_type: 'code',
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
