import {sectionSpec} from '@stagistic/script';

import type {FountainBlockBinding} from '../types';
import styles from './section.module.css';
import {SectionIcon} from './icon';

export const sectionBinding: FountainBlockBinding = {
    spec: sectionSpec,
    cssClass: styles.section,
    cssVarPrefix: 'section',
    icon: SectionIcon,
};
