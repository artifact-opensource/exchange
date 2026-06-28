import { InvestorProfile } from '../types';

export const INVESTOR_PROFILE: InvestorProfile = {
  id: 'inv-123456',
  email: 'investor@example.com',
  name: 'Alex Sterling',
  type: 'Individual',
  accredited: true,
  investment_tier: 'platinum',
  voting_weight: 12500
};

export interface Investment {
  id: string;
  date: string;
  type: 'SAFE Note' | 'Equity' | 'Token Warrant';
  round: 'Pre-Seed' | 'Seed' | 'Series A';
  amount_usd: number;
  status: 'completed' | 'processing' | 'pending';
}

export const INVESTMENTS_DATA: Investment[] = [
  {
    id: 'tx-001',
    date: 'Jan 15, 2026',
    type: 'SAFE Note',
    round: 'Pre-Seed',
    amount_usd: 50000,
    status: 'completed'
  },
  {
    id: 'tx-002',
    date: 'Mar 10, 2026',
    type: 'Token Warrant',
    round: 'Seed',
    amount_usd: 25000,
    status: 'processing'
  }
];

export interface ProposalOption {
  id: string;
  label: string;
}

export interface ProposalVote {
  userId: string;
  optionId: string;
  weight: number;
  timestamp: string;
}

export interface Proposal {
  id: string;
  category: 'governance' | 'protocol_upgrade' | 'budget';
  status: 'active' | 'closed' | 'pending';
  title: string;
  description: string;
  voting_closes: string;
  quorum_required: number;
  options: ProposalOption[];
  votes: ProposalVote[];
}

export const PROPOSALS_DATA: Proposal[] = [
  {
    id: 'prop-101',
    category: 'governance',
    status: 'active',
    title: 'Authorize Series A Fundraising',
    description: 'Proposal to authorize the board to seek Series A funding of up to $5M at a $25M pre-money valuation to accelerate US market entry and data center acquisition.',
    voting_closes: '2026-06-15',
    quorum_required: 0.60,
    options: [
      { id: 'opt-1', label: 'Approve Authorization' },
      { id: 'opt-2', label: 'Reject' },
      { id: 'opt-3', label: 'Abstain' }
    ],
    votes: [
      { userId: 'inv-002', optionId: 'opt-1', weight: 5000, timestamp: '2026-05-20T10:00:00Z' }
    ]
  },
  {
    id: 'prop-102',
    category: 'protocol_upgrade',
    status: 'closed',
    title: 'Migrate ARC Token to Base Mainnet',
    description: 'Technical proposal to bridge ARC utility tokens from Ethereum L1 to Base L2 for lower gas fees and faster settlement times.',
    voting_closes: '2026-04-01',
    quorum_required: 0.50,
    options: [
      { id: 'opt-1', label: 'Yes, Migrate' },
      { id: 'opt-2', label: 'No, Stay on L1' }
    ],
    votes: []
  }
];