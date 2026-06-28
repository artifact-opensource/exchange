export interface Project {
  id: string;
  name: string;
  category: 'AI/ML Core' | 'Enterprise Software' | 'Blockchain / Web3' | 'Developer Tools & Platform';
  status: 'Active' | 'Development' | 'Production' | 'Planning';
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  description: string;
  revenuePotential: string;
  technologies: string[];
  repo?: string;
  version?: string;
}

export interface Company {
  name: string;
  registration: string;
  founded: string;
  headquarters: string;
  mission: string;
  vision: string;
  divisions: { code: string; name: string; focus: string }[];
  social: { github: string; website: string; email: string };
  stats: {
    products: number;
    projects: number;
    categories: number;
  }
}

export interface InvestorProfile {
  id: string;
  email: string;
  name: string;
  type: string;
  accredited: boolean;
  investment_tier: 'gold' | 'silver' | 'platinum';
  voting_weight: number;
}

export interface FinancialMetric {
  year: string;
  revenue: number; // In millions usually
  revenueRange: string;
  grossMargin: string;
  ebitdaMargin: string;
}

export interface DocumentFile {
  id: string;
  title: string;
  filename: string;
  category: 'Strategy' | 'Financials' | 'Product' | 'Legal';
  content: string;
  lastUpdated: string;
}

export interface RoadmapTask {
  id: string;
  name: string;
  status: 'completed' | 'in-progress' | 'pending';
}

export interface RoadmapMilestone {
  id: string;
  quarter: string;
  title: string;
  description: string;
  status: 'completed' | 'in-progress' | 'upcoming';
  category: 'Regulatory' | 'Product' | 'Corporate' | 'Infrastructure';
  tasks: RoadmapTask[];
  dependencies: string[]; // List of dependency names
}
