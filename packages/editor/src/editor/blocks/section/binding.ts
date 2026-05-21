import {sectionSpec} from '@stagistic/script';
import {SectionBlockIcon} from '@stagistic/ui';

import type {FountainBlockBinding} from '../types';
import styles from './section.module.css';

export const sectionBinding: FountainBlockBinding = {
    spec: sectionSpec,
    cssClass: styles.section,
    cssVarPrefix: 'section',
    icon: SectionBlockIcon,
};
