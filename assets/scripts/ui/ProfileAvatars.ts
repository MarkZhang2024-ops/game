/**
 * Profile portraits. header is the gold-ring icon on the level page.
 * portrait is the pink-ring icon inside the profile grid.
 */

export interface ProfileAvatar {
    /** Server user_avatar and the stored avatarId. "1" through "6". */
    id: string;
    header: string;
    portrait: string;
}

export const PROFILE_AVATARS: ProfileAvatar[] = [
    {
        id: '1',
        header: '99c5183a-52ef-43bb-8ad2-eb4e50a349ee@f9941',
        portrait: 'c5860d3a-1a5c-4e8e-9ef9-5224d5800106@f9941',
    },
    {
        id: '2',
        header: 'e04a31e9-58cf-4591-826c-69ff3dc2a082@f9941',
        portrait: 'b43ba666-0c36-40f8-a528-5d07e3e3f2a0@f9941',
    },
    {
        id: '3',
        header: '0c59e548-be96-40e2-b488-90fb5cec4ad5@f9941',
        portrait: '81c2b6d9-c700-4f6d-aab8-4658ff550560@f9941',
    },
    {
        id: '4',
        header: '10541b66-0e1d-461d-943c-d04e5c1d654e@f9941',
        portrait: 'e48fcdc3-7e29-4ae1-b505-1bb9c3aaed73@f9941',
    },
    {
        id: '5',
        header: '4fb80922-f31c-41f0-b69c-e37dd135d398@f9941',
        portrait: '35ed2361-bf70-49f2-886c-ddf1c2d39148@f9941',
    },
    {
        id: '6',
        header: '972077fb-20b9-432c-b39c-7ff2dcaf3fd2@f9941',
        portrait: 'a58cbe3c-44dc-407b-99c8-4b6eacdc501c@f9941',
    },
];

const LEGACY_IDS: Record<string, string> = {
    bear: '1',
    cat: '2',
    dragon: '3',
    bunny: '4',
    penguin: '5',
    chick: '6',
};

/** Server user_avatar "1"–"6", or an older animal name, becomes the stored avatarId. */
export function avatarIdFromServer(value: unknown): string | null {
    const text = typeof value === 'number' && Number.isFinite(value)
        ? String(Math.floor(value))
        : typeof value === 'string' ? value.trim() : '';
    if (!text) return null;
    const id = LEGACY_IDS[text] ?? text;
    return PROFILE_AVATARS.some((avatar) => avatar.id === id) ? id : null;
}

export function profileAvatar(id: string): ProfileAvatar {
    const mapped = avatarIdFromServer(id);
    return PROFILE_AVATARS.find((avatar) => avatar.id === mapped) ?? PROFILE_AVATARS[0];
}
