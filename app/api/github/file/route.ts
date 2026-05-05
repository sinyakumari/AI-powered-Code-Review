import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, unauthorizedResponse } from '@/middleware/auth.middleware';
import { MESSAGES, STATUS_CODES, EDITOR } from '@/lib/constants';

const ALLOWED_EXTENSIONS = [
  '.js', '.ts', '.py', '.java', '.cpp', '.c',
  '.cs', '.php', '.rb', '.go', '.jsx', '.tsx',
  '.html', '.css', '.json', '.xml', '.yaml',
  '.yml', '.md', '.sh', '.swift', '.kt',
  '.rs', '.vue', '.dart', '.scala', '.r',
  '.m', '.h', '.sql', '.graphql'
];

export async function GET(req: NextRequest) {
  try {
    // Verify JWT Auth
    const user = verifyAuth(req);
    if (!user) {
      return unauthorizedResponse();
    }

    const url = req.nextUrl.searchParams.get('url');

    if (!url) {
      return NextResponse.json(
        { success: false, message: 'File URL is required' },
        { status: STATUS_CODES.BAD_REQUEST }
      );
    }

    // Parse URL to validate hostname and extension
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch (e) {
      return NextResponse.json(
        { success: false, message: MESSAGES.ERROR.GITHUB_FETCH_FAILED },
        { status: STATUS_CODES.BAD_REQUEST }
      );
    }

    if (parsedUrl.hostname !== 'raw.githubusercontent.com') {
      return NextResponse.json(
        { success: false, message: MESSAGES.ERROR.GITHUB_FETCH_FAILED },
        { status: STATUS_CODES.BAD_REQUEST }
      );
    }

    const pathname = parsedUrl.pathname.toLowerCase();
    const hasAllowedExtension = ALLOWED_EXTENSIONS.some(ext => pathname.endsWith(ext));

    if (!hasAllowedExtension) {
      return NextResponse.json(
        { success: false, message: MESSAGES.ERROR.GITHUB_FETCH_FAILED },
        { status: STATUS_CODES.BAD_REQUEST }
      );
    }

    // Fetch the file
    // Note: It's good practice to pass the github token if it's a private repo, 
    // but raw.githubusercontent.com urls from private repos contain a token in the query params.
    // If the user expects to fetch using their github token, we can get it from headers.
    const githubToken = req.headers.get('x-github-token');
    
    const headers: Record<string, string> = {};
    if (githubToken) {
      headers['Authorization'] = `Bearer ${githubToken}`;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: MESSAGES.ERROR.GITHUB_FETCH_FAILED },
        { status: STATUS_CODES.BAD_REQUEST }
      );
    }

    const content = await response.text();
    const size = content.length;

    if (size > EDITOR.MAX_CHARS) {
      return NextResponse.json(
        { success: false, message: MESSAGES.ERROR.GITHUB_FILE_TOO_LARGE },
        { status: STATUS_CODES.BAD_REQUEST }
      );
    }

    return NextResponse.json(
      { success: true, content, size },
      { status: STATUS_CODES.OK }
    );
  } catch (error: any) {
    console.error('GitHub File Fetch API Error:', error.message);
    return NextResponse.json(
      { success: false, message: MESSAGES.ERROR.SERVER_ERROR },
      { status: STATUS_CODES.INTERNAL_SERVER_ERROR }
    );
  }
}
