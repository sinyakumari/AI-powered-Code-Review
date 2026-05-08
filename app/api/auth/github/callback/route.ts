import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  try {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    
    const savedState = req.cookies.get('github_oauth_repo_state')?.value;
    
    if (!code || !state || !savedState || state !== savedState) {
      throw new Error('Invalid state or missing parameters');
    }

    const clientId = process.env.GITHUB_IMPORT_CLIENT_ID;
    const clientSecret = process.env.GITHUB_IMPORT_CLIENT_SECRET;
    const envRedirectUri = process.env.GITHUB_REDIRECT_URI;
    
    const dynamicRedirectUri = `${baseUrl}/api/auth/github/callback`;
    const redirect_uri = envRedirectUri || dynamicRedirectUri;

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
        redirect_uri: redirect_uri,
      }),
    });

    const tokenData = await tokenResponse.json();
    
    if (tokenData.error) {
      throw new Error(tokenData.error_description || 'Failed to exchange code for token');
    }

    const accessToken = tokenData.access_token;

    const response = NextResponse.redirect(new URL(`/review?github_token=${accessToken}&tab=github`, baseUrl));
    response.cookies.delete('github_oauth_repo_state');
    
    return response;

  } catch (error: any) {
    console.error('GitHub Repo Callback API Error:', error.message);
    const errorMessage = encodeURIComponent(error.message || 'unknown_error');
    return NextResponse.redirect(new URL(`/review?error=github_failed&details=${errorMessage}&tab=github`, baseUrl));
  }
}
