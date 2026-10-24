import type { Narrator } from '../types';

export const narratorName = (n: Narrator) => n.full_name_tamil || n.full_name_english || '';
export const narratorInitials = (n: Narrator) => Array.from(narratorName(n))[0] ?? '?';
