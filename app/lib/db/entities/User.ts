import {
    Collection,
    Entity,
    OneToMany,
    Property,
} from '@mikro-orm/core';

import {Base} from './Base';
import {UserTeam} from './UserTeam';

@Entity()
export class User extends Base {
    @Property({unique: true})
    email!: string;

    @Property({nullable: true})
    name?: string;

    @Property({default: true})
    isVerified: boolean = true;

    @OneToMany(() => UserTeam, userTeam => userTeam.user)
    userTeams = new Collection<UserTeam>(this);
}
