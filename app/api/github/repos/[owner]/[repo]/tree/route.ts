import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, unauthorizedResponse } from '@/middleware/auth.middleware';
import { MESSAGES, STATUS_CODES } from '@/lib/constants';

/**
 * GET /api/github/repos/[owner]/[repo]/tree
 * Fetches the full repository file tree
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> }
) {
  const user = verifyAuth(req);
  if (!user) return unauthorizedResponse();

  const githubToken = req.headers.get('x-github-token');
  if (!githubToken) {
    return NextResponse.json(
      { success: false, message: MESSAGES.ERROR.GITHUB_TOKEN_FAILED },
      { status: STATUS_CODES.BAD_REQUEST }
    );
  }

  const { owner, repo } = await params;

  try {
    // 1. Get the latest tree (recursive)
    const treeRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`,
      {
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    );

    if (!treeRes.ok) {
      throw new Error('Failed to fetch tree from GitHub');
    }

    const treeData = await treeRes.json();

    // 2. Filter tree: Files only, exclude junk, max 200 files
    const excludePatterns = ['node_modules', '.git', 'dist', 'build'];
    const filteredItems = treeData.tree
      .filter((item: any) => {
        // Must be a blob (file)
        if (item.type !== 'blob') return false;
        
        // Exclude specific directories
        if (excludePatterns.some(pattern => item.path.includes(pattern))) return false;
        
        // Exclude binary files (very basic check)
        const binaryExts = ['.png', '.jpg', '.jpeg', '.gif', '.pdf', '.zip', '.exe'];
        if (binaryExts.some(ext => item.path.toLowerCase().endsWith(ext))) return false;

        return true;
      })
      .slice(0, 200);

    // 3. Format as readable tree string
    // Example:
    // src/
    //   components/
    //     Navbar.tsx
    let treeString = '';
    const paths = filteredItems.map((f: any) => f.path);
    
    // Simple indentation logic
    paths.sort().forEach((path: string) => {
      const parts = path.split('/');
      const indent = '  '.repeat(parts.length - 1);
      const name = parts[parts.length - 1];
      
      // Add directory markers if needed (simplified)
      // In a real tree, we'd track directory levels, but for LLM context, flat-ish with indents is fine
      treeString += `${indent}${name}\n`;
    });

    return NextResponse.json({
      success: true,
      tree: treeString,
      total_files: filteredItems.length
    });

  } catch (error: any) {
    console.error('GitHub Tree API Error:', error);
    return NextResponse.json(
      { success: false, message: MESSAGES.ERROR.GITHUB_TREE_FAILED },
      { status: STATUS_CODES.INTERNAL_SERVER_ERROR }
    );
  }
}
