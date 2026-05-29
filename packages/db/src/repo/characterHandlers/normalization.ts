import {collapseWhitespace} from '@stagistic/shared';

export const DEFAULT_GENDER_LABEL_BY_KEY = new Map<string, string>([['male', 'Male'], ['female', 'Female']]);

export const normalizeGenderLabel = (label: string) => collapseWhitespace(label);

export const normalizeGenderKey = (label: string) => normalizeGenderLabel(label).toLocaleLowerCase();
