import {Migration} from '@mikro-orm/migrations';

export class Migration20250521101138 extends Migration {
    override up(): void {
        this.addSql('create table "user" ("id" varchar(255) not null, "created_at" timestamptz not null default \'now()\', "updated_at" timestamptz not null, "email" varchar(255) not null, "name" varchar(255) null, "is_verified" boolean not null default false, constraint "user_pkey" primary key ("id"));');
        this.addSql('alter table "user" add constraint "user_email_unique" unique ("email");');

        this.addSql('create table "team" ("id" varchar(255) not null, "created_at" timestamptz not null default \'now()\', "updated_at" timestamptz not null, "name" varchar(255) not null, "owner_id" varchar(255) null, constraint "team_pkey" primary key ("id"));');
        this.addSql('alter table "team" add constraint "team_name_unique" unique ("name");');

        this.addSql('create table "role" ("id" varchar(255) not null, "name" varchar(255) not null, "team_id" varchar(255) not null, constraint "role_pkey" primary key ("id"));');
        this.addSql('alter table "role" add constraint "role_name_unique" unique ("name");');

        this.addSql('create table "user_team" ("id" varchar(255) not null, "user_id" varchar(255) not null, "team_id" varchar(255) not null, "role_id" varchar(255) not null, constraint "user_team_pkey" primary key ("id"));');

        this.addSql('alter table "team" add constraint "team_owner_id_foreign" foreign key ("owner_id") references "user" ("id") on update cascade on delete set null;');

        this.addSql('alter table "role" add constraint "role_team_id_foreign" foreign key ("team_id") references "team" ("id") on update cascade;');

        this.addSql('alter table "user_team" add constraint "user_team_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade;');
        this.addSql('alter table "user_team" add constraint "user_team_team_id_foreign" foreign key ("team_id") references "team" ("id") on update cascade;');
        this.addSql('alter table "user_team" add constraint "user_team_role_id_foreign" foreign key ("role_id") references "role" ("id") on update cascade;');
    }

    override down(): void {
        this.addSql('alter table "team" drop constraint "team_owner_id_foreign";');

        this.addSql('alter table "user_team" drop constraint "user_team_user_id_foreign";');

        this.addSql('alter table "role" drop constraint "role_team_id_foreign";');

        this.addSql('alter table "user_team" drop constraint "user_team_team_id_foreign";');

        this.addSql('alter table "user_team" drop constraint "user_team_role_id_foreign";');

        this.addSql('drop table if exists "user" cascade;');

        this.addSql('drop table if exists "team" cascade;');

        this.addSql('drop table if exists "role" cascade;');

        this.addSql('drop table if exists "user_team" cascade;');
    }
}
