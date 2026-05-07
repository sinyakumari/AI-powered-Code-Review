import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { query } from '@/lib/db';
import { AUTH, ROUTES } from '@/lib/constants';

export async function GET(req: NextRequest) {
  const host = req.headers.get('host');
  const protocol = host?.includes('localhost') ? 'http' : 'https';
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;
  
  try {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    
    const savedState = req.cookies.get('github_oauth_state')?.value;
    
    if (!code || !state || !savedState || state !== savedState) {
      throw new Error('Invalid state or missing parameters');
    }

    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    const dynamicRedirectUri = `${baseUrl}/api/auth/github/login/callback`;

    if (!clientId || !clientSecret) {
      throw new Error('GitHub OAuth credentials are not fully configured');
    }

    // Exchange code for token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: dynamicRedirectUri,
      }),
    });

    const tokenData = await tokenResponse.json();
    
    if (tokenData.error) {
      throw new Error(tokenData.error_description || 'Failed to exchange code for token');
    }

    const accessToken = tokenData.access_token;

    // Get user info
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!userResponse.ok) {
      throw new Error('Failed to fetch user info from GitHub');
    }

    const githubUser = await userResponse.json();
    let email = githubUser.email;

    // If email is null, fetch primary email
    if (!email) {
      const emailsResponse = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (emailsResponse.ok) {
        const emails = await emailsResponse.json();
        const primaryEmail = emails.find((e: any) => e.primary && e.verified);
        if (primaryEmail) {
          email = primaryEmail.email;
        }
      }
    }

    // Step 1: Get GitHub user email
    const githubEmail = githubUser.email || email;
    const githubName = githubUser.name || githubUser.login;
    const githubId = String(githubUser.id);

    let userId: number;
    let userName: string;
    let userEmail: string;
    let isNewUser = false;

    // Step 2: Look up by github_id FIRST
    const byGithubId: any[] = await query(
      'SELECT user_id, name, email, github_id FROM users WHERE github_id = ?',
      [githubId]
    );

    if (byGithubId.length > 0) {
      userId = byGithubId[0].user_id;
      userName = byGithubId[0].name;
      userEmail = byGithubId[0].email;
      isNewUser = false;
    } else {
      // Step 3: If NOT found by github_id, Look up by GitHub email
      const byEmail: any[] = await query(
        'SELECT user_id, name, email, github_id FROM users WHERE email = ?',
        [githubEmail]
      );

      if (byEmail.length > 0) {
        // Existing user with different auth - Link GitHub to this account
        await query(
          'UPDATE users SET github_id = ? WHERE user_id = ?',
          [githubId, byEmail[0].user_id]
        );
        userId = byEmail[0].user_id;
        userName = byEmail[0].name;
        userEmail = byEmail[0].email;
        isNewUser = false;
      } else {
        // Brand new user
        const result: any = await query(
          'INSERT INTO users (name, email, github_id) VALUES (?, ?, ?)',
          [githubName, githubEmail, githubId]
        );
        userId = result.insertId;
        userName = githubName;
        userEmail = githubEmail;
        isNewUser = true;
      }
    }

    // Step 4: Generate JWT with correct data
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET not defined');

    const token = jwt.sign(
      {
        user_id: userId,
        email: userEmail,
        name: userName
      },
      secret,
      { expiresIn: AUTH.JWT_EXPIRY }
    );

    // Step 5: Build correct redirect
    const userPayload = {
      user_id: userId,
      name: userName,
      email: userEmail
    };

    const redirectPath = isNewUser
      ? ROUTES.SET_PASSWORD
      : ROUTES.AUTH_SUCCESS;

    const successUrl = new URL(redirectPath, req.url);
    successUrl.searchParams.set('token', token);
    successUrl.searchParams.set('user', JSON.stringify(userPayload));

    const response = NextResponse.redirect(successUrl);
    response.cookies.delete('github_oauth_state');
    return response;

  } catch (error: any) {
    console.error('GitHub Callback API Error:', error.message);
    return NextResponse.redirect(new URL('/login?error=github_failed', baseUrl));
  }
}
