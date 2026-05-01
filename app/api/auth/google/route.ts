import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    
    if (!clientId) {
      console.error('GOOGLE_CLIENT_ID is not defined in environment variables.');
      return NextResponse.redirect(new URL('/login?error=google_failed', request.url));
    }

    // Construct redirect URI based on the current request URL for environment flexibility
    const redirectUri = new URL('/api/auth/google/callback', request.url).toString();
    const scope = 'email profile';
    const responseType = 'code';
    
    const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    googleAuthUrl.searchParams.append('client_id', clientId);
    googleAuthUrl.searchParams.append('redirect_uri', redirectUri);
    googleAuthUrl.searchParams.append('scope', scope);
    googleAuthUrl.searchParams.append('response_type', responseType);
    googleAuthUrl.searchParams.append('prompt', 'select_account'); // Optional but good for UX

    return NextResponse.redirect(googleAuthUrl.toString());
  } catch (error) {
    console.error('Error initiating Google OAuth:', error);
    return NextResponse.redirect(new URL('/login?error=google_failed', request.url));
  }
}
