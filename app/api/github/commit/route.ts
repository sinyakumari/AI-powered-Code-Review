import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, unauthorizedResponse } from '@/middleware/auth.middleware';
import { MESSAGES, STATUS_CODES } from '@/lib/constants';

/**
 * POST /api/github/commit
 * Creates a new branch and commits changes to GitHub
 */
export async function POST(req: NextRequest) {
  const user = verifyAuth(req);
  if (!user) return unauthorizedResponse();

  const githubToken = req.headers.get('x-github-token');
  if (!githubToken) {
    return NextResponse.json(
      { success: false, message: MESSAGES.ERROR.GITHUB_TOKEN_FAILED },
      { status: STATUS_CODES.BAD_REQUEST }
    );
  }

  try {
    const { owner, repo, path, content, branch_name, commit_message } = await req.json();

    console.log('Commit request body:', { owner, repo, path, branch_name, commit_message });
    console.log('GitHub token exists:', !!githubToken);

    // 1. Validation
    if (!owner || !repo || !path || !content || !branch_name || !commit_message) {
      return NextResponse.json(
        { success: false, message: MESSAGES.ERROR.REQUIRED_FIELDS },
        { status: STATUS_CODES.BAD_REQUEST }
      );
    }

    const branchRegex = /^[a-zA-Z0-9\-\_\/]+$/;
    if (!branchRegex.test(branch_name)) {
      return NextResponse.json(
        { success: false, message: 'Invalid branch name format.' },
        { status: STATUS_CODES.BAD_REQUEST }
      );
    }

    if (Buffer.byteLength(content, 'utf8') > 1024 * 1024) {
      return NextResponse.json(
        { success: false, message: 'File too large (max 1MB)' },
        { status: STATUS_CODES.BAD_REQUEST }
      );
    }

    // 2. Get default branch and its SHA
    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });
    if (!repoRes.ok) throw new Error('Failed to fetch repo info');
    const repoData = await repoRes.json();
    const defaultBranch = repoData.default_branch;

    const refRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${defaultBranch}`, {
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });
    if (!refRes.ok) throw new Error(`Failed to fetch ${defaultBranch} ref`);
    const refData = await refRes.json();
    const latestSha = refData.object.sha;

    // 3. Create new branch
    const createBranchRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ref: `refs/heads/${branch_name}`,
        sha: latestSha,
      }),
    });

    if (!createBranchRes.ok) {
      const error = await createBranchRes.json();
      if (error.message !== 'Reference already exists') {
        throw new Error('Failed to create branch: ' + error.message);
      }
    }

    // 4. Get current file SHA (needed for update)
    const fileRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch_name}`, {
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });
    
    let fileSha: string | undefined;
    if (fileRes.ok) {
      const fileData = await fileRes.json();
      fileSha = fileData.sha;
    }

    // 5. Commit file to new branch
    const commitRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: commit_message,
        content: Buffer.from(content).toString('base64'),
        sha: fileSha,
        branch: branch_name,
      }),
    });

    if (!commitRes.ok) {
      const error = await commitRes.json();
      throw new Error('Failed to commit file: ' + error.message);
    }

    return NextResponse.json({
      success: true,
      branch: branch_name,
      compare_url: `https://github.com/${owner}/${repo}/compare/${branch_name}?expand=1&title=${encodeURIComponent(commit_message)}`,
      message: MESSAGES.SUCCESS.GITHUB_COMMITTED
    });

  } catch (error: any) {
    console.error('GitHub Commit API Error:', error);
    return NextResponse.json(
      { success: false, message: MESSAGES.ERROR.GITHUB_COMMIT_FAILED, details: error.message },
      { status: STATUS_CODES.INTERNAL_SERVER_ERROR }
    );
  }
}
