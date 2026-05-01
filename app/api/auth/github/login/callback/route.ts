import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { query } from '@/lib/db';
import { AUTH } from '@/lib/constants';

export async function GET(req: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
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
    const redirectUri = process.env.GITHUB_LOGIN_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
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
        redirect_uri: redirectUri,
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

    if (!email) {
      throw new Error('GitHub account must have a verified email address');
    }

    // Check DB
    const checkSql = 'SELECT * FROM users WHERE email = ? OR github_id = ?';
    const existingUsers: any[] = await query(checkSql, [email, githubUser.id.toString()]);
    
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET is not defined');

    if (existingUsers.length > 0) {
      // User exists
      const user = existingUsers[0];
      
      // Update github_id if null
      if (!user.github_id) {
        await query('UPDATE users SET github_id = ? WHERE user_id = ?', [githubUser.id.toString(), user.user_id]);
      }

      const token = jwt.sign(
        { 
          user_id: user.user_id, 
          email: user.email,
          name: user.name 
        },
        secret,
        { expiresIn: AUTH.JWT_EXPIRY }
      );

      const encodedUser = encodeURIComponent(JSON.stringify({
        user_id: user.user_id,
        name: user.name,
        email: user.email
      }));

      const response = NextResponse.redirect(new URL(`/auth/success?token=${token}&user=${encodedUser}`, baseUrl));
      response.cookies.delete('github_oauth_state');
      return response;
      
    } else {
      // New user
      const insertSql = 'INSERT INTO users (name, email, github_id) VALUES (?, ?, ?)';
      const insertResult: any = await query(insertSql, [githubUser.name || githubUser.login, email, githubUser.id.toString()]);
      
      const newUserId = insertResult.insertId;

      const token = jwt.sign(
        { 
          user_id: newUserId, 
          email: email,
          name: githubUser.name || githubUser.login 
        },
        secret,
        { expiresIn: AUTH.JWT_EXPIRY }
      );

      const encodedUser = encodeURIComponent(JSON.stringify({
        user_id: newUserId,
        name: githubUser.name || githubUser.login,
        email: email
      }));

      const response = NextResponse.redirect(new URL(`/auth/set-password?token=${token}&user=${encodedUser}`, baseUrl));
      response.cookies.delete('github_oauth_state');
      return response;
    }

  } catch (error: any) {
    console.error('GitHub Callback API Error:', error.message);
    return NextResponse.redirect(new URL('/login?error=github_failed', baseUrl));
  }
}
