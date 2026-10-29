import {dgModern} from './definitions/dgModern';
import {dgMusical} from './definitions/dgMusical';
import {dgTraditional} from './definitions/dgTraditional';
import {samuelFrench} from './definitions/samuelFrench';
import {sketchComedy} from './definitions/sketchComedy';
import {stagisticDefault} from './definitions/stagisticDefault';
import type {FormatTemplate} from './types';

export const ALL_FORMAT_TEMPLATES: readonly FormatTemplate[] = [
    stagisticDefault,
    dgTraditional,
    dgModern,
    dgMusical,
    samuelFrench,
    sketchComedy,
];
export const getFormatTemplate = (id: string): FormatTemplate | undefined => ALL_FORMAT_TEMPLATES.find(template => template.id === id);
