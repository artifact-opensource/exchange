
export enum SectionId {
  RD = 'rd',
  ML = 'ml',
  FT = 'ft',
  ST = 'st',
  IM = 'im'
}

export interface DimensionConfig {
  id: SectionId;
  title: string;
  subtitle: string;
  description: string;
  bgGradient: string;
  accentColor: string;
  sourceUrls: string[];
}

export interface GeminiResponse {
  insight: string;
  visionaryQuote: string;
}

export interface GitHubContent {
  name: string;
  path: string;
  type: 'file' | 'dir';
  size: number;
  download_url: string | null;
}

export interface GitHubRepo {
  name: string;
  full_name: string;
  description: string | null;
  stargazers_count: number;
  language: string | null;
  html_url: string;
}

export interface ProjectState {
  repoPath: string;
  repoDetails: GitHubRepo | null;
  contents: GitHubContent[];
}
