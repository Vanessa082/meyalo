export interface InterestOption {
  id: string;
  title: string;
  description: string;
  categoryKeys: string[];
}

export const INTEREST_OPTIONS: InterestOption[] = [
  {
    id: 'technology',
    title: 'Technology & Software',
    description: 'AI, mobile & web dev, cloud engineering, cybersecurity',
    categoryKeys: ['tech', 'software', 'ai', 'developer', 'engineering'],
  },
  {
    id: 'business',
    title: 'Business & Entrepreneurship',
    description: 'SME growth, tax compliance, startup pitching, leadership',
    categoryKeys: ['business', 'entrepreneurship', 'sme', 'startup'],
  },
  {
    id: 'finance',
    title: 'Finance & Banking',
    description: 'Fintech, accounting, capital raising, corporate investment',
    categoryKeys: ['finance', 'banking', 'fintech', 'investment'],
  },
  {
    id: 'agriculture',
    title: 'Agriculture & Trade',
    description:
      'Agribusiness, export standards, food processing, supply chain',
    categoryKeys: ['agriculture', 'agri', 'trade', 'export'],
  },
  {
    id: 'healthcare',
    title: 'Healthcare & BioTech',
    description: 'Medical technology, public health, pharmaceutical innovation',
    categoryKeys: ['health', 'healthcare', 'medical', 'bio'],
  },
  {
    id: 'education',
    title: 'Education & Certifications',
    description: 'Skill masterclasses, technical certifications, training',
    categoryKeys: ['education', 'masterclass', 'training', 'certification'],
  },
  {
    id: 'creative_media',
    title: 'Creative Economy & Media',
    description: 'Digital marketing, content monetization, design, film',
    categoryKeys: ['creative', 'design', 'media', 'marketing'],
  },
  {
    id: 'engineering',
    title: 'Engineering & Energy',
    description: 'Civil, electrical, renewable energy, manufacturing',
    categoryKeys: ['engineering', 'energy', 'manufacturing'],
  },
  {
    id: 'climate_energy',
    title: 'Climate & Sustainability',
    description: 'Green energy, environmental policy, sustainable trade',
    categoryKeys: ['climate', 'environment', 'sustainability', 'green'],
  },
  {
    id: 'public_policy',
    title: 'Public Policy & Governance',
    description: 'Government relations, legal framework, regional integration',
    categoryKeys: ['policy', 'governance', 'legal', 'public'],
  },
];
