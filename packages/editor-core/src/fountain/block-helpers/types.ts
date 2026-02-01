import type {FountainElement, FountainElementType} from '../types';

export type FountainBlockTypeChangeTarget = FountainElement;

export type EnterNextTypeMap = Partial<Record<FountainElementType, FountainElementType>>;
