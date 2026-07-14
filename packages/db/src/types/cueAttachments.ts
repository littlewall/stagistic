export const CUE_ATTACHMENT_ROLES = {
    integratedScore: 'integrated_score',
} as const;

export type CueAttachmentRole = typeof CUE_ATTACHMENT_ROLES[keyof typeof CUE_ATTACHMENT_ROLES];
