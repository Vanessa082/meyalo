export interface GoalOption {
  id: string;
  title: string;
  description: string;
}

export const GOAL_OPTIONS: GoalOption[] = [
  {
    id: 'learn_skills',
    title: 'Learn new skills & certifications',
    description: 'Technical masterclasses, workshops, hands-on training',
  },
  {
    id: 'advance_career',
    title: 'Advance my career & find work',
    description: 'Career fairs, hiring events, resume clinics, mentorship',
  },
  {
    id: 'grow_business',
    title: 'Grow my business & find clients',
    description: 'B2B forums, SME growth workshops, client networking',
  },
  {
    id: 'meet_people',
    title: 'Meet useful peers & leaders',
    description: 'Founder mixers, professional gatherings, industry meetups',
  },
  {
    id: 'find_funding',
    title: 'Find funding & investor pitch sessions',
    description:
      'Investor demo days, capital raising masterclasses, pitch nights',
  },
  {
    id: 'share_expertise',
    title: 'Share expertise & speak',
    description: 'Call for speakers, panel presentations, thought leadership',
  },
  {
    id: 'stay_informed',
    title: 'Stay informed on sector trends',
    description: 'Keynotes, industry expos, market insight webinars',
  },
];
