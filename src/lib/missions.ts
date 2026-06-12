import type { Guest } from '@/types/database'

type RoleTemplate = Pick<Guest,
  'role_name' | 'role_description' | 'mission_easy' | 'mission_medium' | 'mission_legendary'
>

export const GONDOLIERI_ROLES: RoleTemplate[] = [
  {
    role_name: 'Keeper of Celebrations',
    role_description: 'You make sure the birthday energy never dips. If the vibe is low, that is your fault. No pressure.',
    mission_easy: "Call Isaac 'Captain' at least once. Bonus points if he accepts it without blinking.",
    mission_medium: "Get two people to join a spontaneous toast for Isaac. Keep it short. Keep it sincere.",
    mission_legendary: "Help create one group photo that actually looks fun and not like we were fighting the sun.",
  },
  {
    role_name: 'Chief of Questionable Decisions',
    role_description: 'You are the person everyone looks at when someone says "should we?" The answer is always yes.',
    mission_easy: "Be the first to say Happy Birthday to Isaac today.",
    mission_medium: "Start a completely pointless debate. Pizza vs tacos. Best decade. Something meaningless. Get at least 4 people in.",
    mission_legendary: "Convince Isaac to tell a story that starts with 'okay so one time...' Get at least 3 people listening.",
  },
  {
    role_name: 'Official Boat Historian',
    role_description: 'You are in charge of remembering things accurately. Or at least memorably.',
    mission_easy: "Notice something funny or unexpected today. Remember it. You will need it later.",
    mission_medium: "Find out what three different people think Isaac would do with a surprise million dollars.",
    mission_legendary: "Get a candid photo of Isaac laughing that he would actually use as a profile picture.",
  },
  {
    role_name: 'Navigator of Vibes',
    role_description: 'You read the room and quietly steer things in the right direction. Nobody sees you doing it.',
    mission_easy: "Introduce yourself to at least one person you have never met before.",
    mission_medium: "Introduce two people who don't know each other and give them something to talk about.",
    mission_legendary: "Get five people pointing in the same direction at the same time without explaining why.",
  },
  {
    role_name: 'Minister of Snacks and Morale',
    role_description: 'Nobody goes hungry. Nobody goes sad. These are your two rules.',
    mission_easy: "Compliment someone's outfit. Make it specific. Not just 'nice shirt.'",
    mission_medium: "Make at least one baby smile on purpose. This is worth more points than anything else.",
    mission_legendary: "Protect the snacks. Keep them organized. Make sure Isaac gets the first one of everything.",
  },
  {
    role_name: 'Head of Suspicious Behavior',
    role_description: 'You will be doing things today that look odd but are actually very intentional.',
    mission_easy: "Find out Isaac's current biggest life goal. Ask naturally. Do not make it an interview.",
    mission_medium: "Convince three people that one harmless fake fact about Isaac is true. Reveal it at the end.",
    mission_legendary: "Start a tiny boat chant. Keep it going for at least five seconds. Do not explain it.",
  },
  {
    role_name: 'Resident Life Advice Collector',
    role_description: 'You are gathering wisdom today. From everyone. About anything.',
    mission_easy: "Ask five different people for one piece of life advice. Collect them all.",
    mission_medium: "Get the best piece of advice back to Isaac by the end of the day. Deliver it naturally.",
    mission_legendary: "Start a conversation between the oldest and youngest adult here. See what happens.",
  },
  {
    role_name: 'Captain of Chaos (Controlled)',
    role_description: 'You keep things lively without actually breaking anything. Mostly.',
    mission_easy: "Make Isaac laugh once before the boat leaves the dock.",
    mission_medium: "Get the whole crew to sing Happy Birthday at a completely unexpected moment.",
    mission_legendary: "Help create one memory today that Isaac will still be talking about next year.",
  },
]

export const DEFAULT_MISSIONS = {
  easy: "Call Isaac 'Captain' at least once. Bonus points if he accepts it without blinking.",
  medium: "Get two people to join a spontaneous toast for Isaac. Keep it short. Keep it sincere.",
  legendary: "Help create one group photo that actually looks fun and not like we were fighting the sun.",
}
