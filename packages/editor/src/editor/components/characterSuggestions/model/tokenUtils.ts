import {splitTrailingParentheticalSuffix} from '@stagistic/script';

import {getActiveTokenIndex} from '../../../characters/characterTokenScan';

export const splitBaseAndSuffix = (value: string) => splitTrailingParentheticalSuffix(value);

export {getActiveTokenIndex};
