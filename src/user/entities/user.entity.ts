import { UserRole } from "src/user-role/entity/user-role.entity";
import { Column, Entity, JoinTable, ManyToMany, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true, nullable: false })
    email: string;

    @Column({ nullable: false })
    password: string; //Hash

    @Column({ unique: true })
    username?: string;

    @Column({ nullable: true })
    firstName?: string;

    @Column({ nullable: true })
    lastName?: string;

    @Column({ nullable: true })
    profilePictureUrl?: string;

    @ManyToMany(() => UserRole)
    @JoinTable()
    roles: UserRole[];
}
