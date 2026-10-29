/**
 * Leaderboard portrait for avatarId "1"–"6".
 * 4 has no separate leaderboard frame; the page uses its profile portrait.
 */

import { profileAvatar } from './ProfileAvatars';

const AVATARS: Record<string, string> = {
    '1': '659cc0a4-8029-4c2a-adbd-5990f1736af1@f9941',
    '2': 'a9af7dc7-a91d-4998-a001-561ed8b45582@f9941',
    '3': 'dc0357e3-20e4-466e-bcd0-2d830e20cf57@f9941',
    '5': '34736146-764c-4275-9754-fea127c38e8b@f9941',
    '6': '17a71fc4-204e-4966-9aaa-fb2a1a22f1d4@f9941',
};

export function avatarFrame(avatarId: string): string | null {
    return AVATARS[profileAvatar(avatarId).id] ?? null;
}
