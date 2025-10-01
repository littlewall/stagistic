import {
    Entity,
    ManyToOne,
    PrimaryKey,
} from '@mikro-orm/core';
import {nanoid} from 'nanoid';

import {Role} from './Role';
import {Team} from './Team';
import {User} from './User';

@Entity()
export class UserTeam {
    @PrimaryKey()
    id: string = nanoid();

    @ManyToOne(() => User)
    user!: User;

    @ManyToOne(() => Team)
    team!: Team;

    @ManyToOne(() => Role)
    role!: Role;
}
