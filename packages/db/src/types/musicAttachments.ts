export const MUSIC_ATTACHMENT_ROLES = {
    integratedScore: 'integrated_score',
} as const;

export type MusicAttachmentRole = typeof MUSIC_ATTACHMENT_ROLES[keyof typeof MUSIC_ATTACHMENT_ROLES];
