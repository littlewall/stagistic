import {
    Entity,
    ManyToOne,
    PrimaryKey,
    Property,
    Unique,
} from '@mikro-orm/core';
import {nanoid} from 'nanoid';

import {Team} from './Team';

@Entity()
@Unique({properties: ['team', 'name']})
export class Role {
    @PrimaryKey()
    id: string = nanoid();

    @Property()
    name!: string;

    @ManyToOne(() => Team)
    team!: Team;
}
