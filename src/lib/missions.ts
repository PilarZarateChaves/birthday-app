import type { Guest } from '@/types/database'

type MissionTemplate = Pick<Guest,
  'role_name' | 'role_description' | 'mission_title' | 'mission_instructions' | 'mission_difficulty' | 'proof_required' | 'proof_type'
>

export const GONDOLIERI_MISSIONS: MissionTemplate[] = [
  {
    role_name: 'Grand Conspirator of the Riviera',
    role_description: 'Founder of the Society and keeper of its secrets.',
    mission_title: 'The Golden Lemon',
    mission_instructions: 'Quietly track who completes their mission and award The Golden Lemon at the end of the voyage.',
    mission_difficulty: 'easy',
    proof_required: false,
    proof_type: null,
  },
  {
    role_name: 'Keeper of Celebrations',
    role_description: 'Responsible for ensuring the Captain receives the admiration he deserves.',
    mission_title: 'Four Captains',
    mission_instructions: 'Get at least four different people to call Isaac "Captain" during the boat ride. You may not ask anyone directly.',
    mission_difficulty: 'medium',
    proof_required: false,
    proof_type: null,
  },
  {
    role_name: 'Minister of Italian Drama',
    role_description: 'Responsible for bringing passion, opinions, and unnecessary debates to the voyage.',
    mission_title: 'The Great Debate',
    mission_instructions: 'Get at least five people involved in a passionate debate about something completely meaningless — is a hot dog a sandwich? Pineapple on pizza? Best soccer player ever? You may not announce a debate.',
    mission_difficulty: 'medium',
    proof_required: false,
    proof_type: null,
  },
  {
    role_name: 'Riviera Correspondent',
    role_description: 'Official historian of the Society.',
    mission_title: 'Three Laughs',
    mission_instructions: 'Capture three candid photos of Isaac laughing. He cannot know you are trying to complete a mission. Bonus prestige if the laughs are caused by three different people.',
    mission_difficulty: 'medium',
    proof_required: true,
    proof_type: 'photo',
  },
  {
    role_name: 'Master Navigator',
    role_description: 'Responsible for guiding the group toward memorable moments.',
    mission_title: 'One Direction',
    mission_instructions: 'Get five people pointing in the same direction at the same time. You may not tell them it is part of a game.',
    mission_difficulty: 'hard',
    proof_required: true,
    proof_type: 'photo',
  },
  {
    role_name: 'Apprentice Gondoliero',
    role_description: 'Youngest member of the Society and future captain.',
    mission_title: 'Five Wisdoms',
    mission_instructions: 'Collect one piece of advice about life from five different adults. At the end, report your favorite one. No public speaking required.',
    mission_difficulty: 'easy',
    proof_required: false,
    proof_type: null,
  },
  {
    role_name: 'Duchess of Lake Como',
    role_description: 'Responsible for gathering intelligence about the Captain.',
    mission_title: 'The $10M Question',
    mission_instructions: 'Find out what four different people think Isaac would do if he suddenly won $10 million. You may not ask the same question twice in a row.',
    mission_difficulty: 'easy',
    proof_required: false,
    proof_type: null,
  },
  {
    role_name: 'Chief Negotiator',
    role_description: 'Master of persuasion and questionable truths.',
    mission_title: 'The Legend of Isaac',
    mission_instructions: 'Convince three people that one of the following facts about Isaac is true: Isaac almost learned Italian. Isaac secretly wants a Vespa. Isaac could survive on jamón and wine forever. Isaac once considered moving to Italy. You may invent another harmless fact if needed. You cannot reveal the truth until the end.',
    mission_difficulty: 'hard',
    proof_required: false,
    proof_type: null,
  },
]

export const BABY_ROLES = [
  { name: 'Antonella', role_name: 'Tiny Ambassador of Venice', role_description: 'Any adult who makes Antonella smile earns one honorary lemon.' },
  { name: 'Leon', role_name: 'Tiny Ambassador of Sicily', role_description: 'Any adult who gets a photo with Leon earns one honorary lemon.' },
  { name: 'Adrian', role_name: 'Tiny Ambassador of Florence', role_description: 'Any adult who makes Adrian laugh earns one honorary lemon.' },
]
