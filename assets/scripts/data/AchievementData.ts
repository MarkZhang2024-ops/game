/**
 * Achievement cards. One card per level tier.
 * A card stays locked until the player clears a level inside that tier.
 */

import { LevelManager } from '../core/LevelManager';
import { LEVEL_TIERS, tierByLevel } from '../core/LevelTierConfig';

export interface AchievementData {
    id: number;
    title: string;
    /** Card SpriteFrame uuid. Locked and unlocked cards use different art. */
    image: string;
    unlocked: boolean;
    /** 0..1 fill. completedInTier / totalInTier. */
    progress: number;
    completed: number;
    total: number;
}

const LOCKED = {
    street: '5e82ccf6-ffb9-427c-ae04-7997c3b8313e@f9941',
    waterfall: '14a8ec28-8ae8-405a-814e-fe2516b20a8b@f9941',
    fountain: 'e6e9d528-b616-4cab-b3bb-ea62cd955d70@f9941',
    castle: '7653f39d-1b5e-454e-aeb9-4bd5e037b2f4@f9941',
    valley: 'c448f004-7095-4783-845d-855255c97209@f9941',
    river: 'd25b4b60-f7df-483e-be42-7f3532e49080@f9941',
    fort: 'a04a24c6-2b68-45b5-9445-32a9c9d48e91@f9941',
    park: '07515261-50d1-4cd5-9774-de62dcf30018@f9941',
} as const;

const UNLOCKED = {
    street: '860e7eef-6048-4be4-b14a-d07c8aa69007@f9941',
    waterfall: '8de494f9-80af-45b0-b74d-29a6c1d97f79@f9941',
    fountain: '61ee5402-cb75-4d5b-8b83-862b6c566ac5@f9941',
    castle: 'a13275c7-1776-458f-8f7a-410fa3b430e6@f9941',
    valley: '6ca08de7-e981-462c-b093-2312dc1f0f87@f9941',
    river: 'd673b52d-17ee-42ed-acc3-cc6cbc006de3@f9941',
    fort: '1d5d7187-7ace-46cb-b548-afc087671635@f9941',
    park: '01154e39-8e04-4d03-967f-fd0f1a616f79@f9941',
} as const;

interface SceneCard {
    id: number;
    title: string;
    tierId: number;
    locked: string;
    unlocked: string;
    /** Level-page frame: blank header for the name, same scene photo underneath. */
    poster: string;
}

/** Card order follows LEVEL_TIERS. Tier ranges are not copied here. */
const SCENES: SceneCard[] = [
    { id: 1, title: 'Candy Street', tierId: 1, locked: LOCKED.street, unlocked: UNLOCKED.street, poster: '6bb0cf77-89ce-418a-8a81-a06f4b2e7dfa@f9941' },
    { id: 2, title: 'Candy Waterfall', tierId: 2, locked: LOCKED.waterfall, unlocked: UNLOCKED.waterfall, poster: '6b222a8d-b8b1-43be-a76d-71fb9990df4e@f9941' },
    { id: 3, title: 'Candy Fountain', tierId: 3, locked: LOCKED.fountain, unlocked: UNLOCKED.fountain, poster: '418860ec-8791-42a6-95cb-a5f4c38b38ed@f9941' },
    { id: 4, title: 'Candy Castle', tierId: 4, locked: LOCKED.castle, unlocked: UNLOCKED.castle, poster: '159c2c29-ed98-4e52-a7b0-a86df1fff6ef@f9941' },
    { id: 5, title: 'Candy Valley', tierId: 5, locked: LOCKED.valley, unlocked: UNLOCKED.valley, poster: '688cdfe5-c170-4144-8a84-53b70d10ff8c@f9941' },
];

export class AchievementDataSource {
    /** One card per tier. Progress comes from LevelManager, not from a copied range. */
    public static getAchievements(): AchievementData[] {
        return LEVEL_TIERS.map((tier) => {
            const scene = SCENES.find((entry) => entry.tierId === tier.tierId);
            const open = LevelManager.hasReachedTier(tier.tierId);
            const completed = LevelManager.getTierCompletedCount(tier.tierId);
            const total = LevelManager.getTierTotalCount(tier.tierId);
            return {
                id: tier.tierId,
                title: scene?.title ?? `Tier ${tier.tierId}`,
                image: scene ? (open ? scene.unlocked : scene.locked) : LOCKED.street,
                unlocked: open,
                progress: LevelManager.getTierProgress(tier.tierId),
                completed,
                total,
            };
        });
    }

    /** Name and level-page photo for the tier that contains this level. */
    public static sceneForLevel(level: number): { title: string; image: string } {
        const tierId = tierByLevel(level).tierId;
        const scene = SCENES.find((entry) => entry.tierId === tierId) ?? SCENES[0];
        return { title: scene.title, image: scene.poster };
    }
}
