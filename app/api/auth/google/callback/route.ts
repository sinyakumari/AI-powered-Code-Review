import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { query } from '@/lib/db';
import { AUTH, ROUTES } from '@/lib/constants';

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get('code');
    
    if (!code) {
      console.error('No code provided by Google Auth.');
      return NextResponse.redirect(new URL('/login?error=google_failed', request.url));
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      console.error('Missing Google OAuth environment variables.');
      return NextResponse.redirect(new URL('/login?error=google_failed', request.url));
    }

    const redirectUri = new URL('/api/auth/google/callback', request.url).toString();

    // 1. Exchange auth code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('Failed to get Google token:', tokenData);
      return NextResponse.redirect(new URL('/login?error=google_failed', request.url));
    }

    // 2. Fetch user info from Google
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const googleUser = await userResponse.json();

    if (!userResponse.ok) {
      console.error('Failed to get Google user info:', googleUser);
      return NextResponse.redirect(new URL('/login?error=google_failed', request.url));
    }

    const { id: google_id, email, name } = googleUser;

    // 3. Database operations
    const selectSql = 'SELECT user_id, name, email, google_id FROM users WHERE email = ? OR google_id = ?';
    const users: any[] = await query(selectSql, [email, google_id]);
    
    let userId;
    let userName = name;
    let userEmail = email;
    let isNewUser = false;

    if (users.length > 0) {
      // User exists
      const existingUser = users[0];
      userId = existingUser.user_id;
      userName = existingUser.name;
      userEmail = existingUser.email;
      
      // Update google_id if it's not set
      if (!existingUser.google_id) {
        await query('UPDATE users SET google_id = ? WHERE user_id = ?', [google_id, userId]);
      }
    } else {
      // User does not exist, create new
      const insertSql = 'INSERT INTO users (name, email, google_id) VALUES (?, ?, ?)';
      const result: any = await query(insertSql, [name, email, google_id]);
      userId = result.insertId;
      isNewUser = true;
    }

    // 4. Generate JWT
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('JWT_SECRET is not defined');
      return NextResponse.redirect(new URL('/login?error=google_failed', request.url));
    }

    const token = jwt.sign(
      { 
        user_id: userId, 
        email: userEmail,
        name: userName 
      },
      secret,
      { expiresIn: AUTH.JWT_EXPIRY }
    );

    // 5. Redirect to success page
    const userPayload = {
      user_id: userId,
      name: userName,
      email: userEmail
    };

    const successUrl = new URL(isNewUser ? ROUTES.SET_PASSWORD : ROUTES.AUTH_SUCCESS, request.url);
    successUrl.searchParams.set('token', token);
    successUrl.searchParams.set('user', JSON.stringify(userPayload));

    return NextResponse.redirect(successUrl);

  } catch (error) {
    console.error('Google Auth Callback Error:', error);
    return NextResponse.redirect(new URL('/login?error=google_failed', request.url));
  }
}
