import { UserRole } from "src/user-role/entity/user-role.entity";
import { Column, Entity, JoinTable, ManyToMany, PrimaryGeneratedColumn } from "typeorm";
import type { IUser } from "@hangbank/shared";
import { Gender } from "./gender.enum";

@Entity()
export class User implements IUser {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true, nullable: false })
    email: string;

    @Column({ nullable: false })
    password: string; //Hash

    @Column({ unique: true, nullable: true })
    username?: string;

    @Column({ nullable: true })
    firstName?: string;

    @Column({ nullable: true })
    lastName?: string;

    @Column({ nullable: true })
    profilePictureUrl?: string;

    @Column({ type: 'enum', enum: Gender, nullable: true })
    gender?: Gender;

    @Column({ type: 'date', nullable: true })
    birthDate?: Date;

    @ManyToMany(() => UserRole)
    @JoinTable()
    roles: UserRole[];
}
