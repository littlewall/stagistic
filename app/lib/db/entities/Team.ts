import {
    Collection,
    Entity,
    ManyToOne,
    OneToMany,
    Property,
} from '@mikro-orm/core';

import {Base} from './Base';
import {Role} from './Role';
import {User} from './User';
import {UserTeam} from './UserTeam';

@Entity()
export class Team extends Base {
    @Property({unique: true})
    name!: string;

    @OneToMany(() => UserTeam, userTeam => userTeam.team)
    userTeams = new Collection<UserTeam>(this);

    @OneToMany(() => Role, role => role.team)
    roles = new Collection<Role>(this);

    @ManyToOne(() => User, {nullable: true})
    owner?: User;
}
