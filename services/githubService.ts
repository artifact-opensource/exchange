import { GitHubRepo, GitHubContent } from "../types";

const repoCache = new Map<string, { data: GitHubRepo | null, timestamp: number }>();
const contentsCache = new Map<string, { data: GitHubContent[], timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const fetchRepoDetails = async (fullName: string): Promise<GitHubRepo | null> => {
  const cached = repoCache.get(fullName);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const [owner, repo] = fullName.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '').split('/');
  if (!owner || !repo) return null;
  try {
    const response = await fetch(`/api/github/repo/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, { headers: { 'Accept': 'application/json' } });
    if (!response.ok) {
      if (response.status === 404 || response.status === 403) {
        if (response.status === 403) console.warn(`GitHub Rate Limit hit for ${fullName}`);
        return null;
      }
      throw new Error(`Proxy error: ${response.status}`);
    }
    const data = await response.json();
    repoCache.set(fullName, { data, timestamp: Date.now() });
    return data;
  } catch (error) {
    if (error instanceof Error && (error.message.includes('404') || error.message.includes('403'))) return null;
    console.error(`Failed to fetch repo details for ${fullName}:`, error);
    return null;
  }
};

export const fetchRepoContents = async (fullName: string, path: string = ''): Promise<GitHubContent[]> => {
  const cacheKey = `${fullName}:${path}`;
  const cached = contentsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const [owner, repo] = fullName.split('/');
  try {
    const response = await fetch(`/api/github/contents/${owner}/${repo}?path=${encodeURIComponent(path)}`);
    if (!response.ok) {
      if (response.status === 404 || response.status === 403) {
        return [];
      }
      throw new Error(`Proxy error: ${response.status}`);
    }
    const data = await response.json();
    const result = Array.isArray(data) ? data : [data];
    contentsCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (error) {
    if (error instanceof Error && (error.message.includes('404') || error.message.includes('403'))) return [];
    console.error(`Failed to fetch repo contents for ${fullName}:`, error);
    return [];
  }
};

export const fetchTrendingRepositories = async (): Promise<GitHubRepo[]> => {
  try {
    const response = await fetch(`https://api.github.com/search/repositories?q=stars:>10000&sort=stars&order=desc&per_page=6`);
    if (!response.ok) throw new Error(`GitHub API error: ${response.status}`);
    const data = await response.json();
    return data.items as GitHubRepo[];
  } catch (error) {
    console.error("Failed to fetch trending GitHub data:", error);
    return [];
  }
};
