import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class UserRole {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({unique: true, nullable: false})
    role: string; //e.g. 'admin', 'user', 'editor', etc.

    @Column({nullable: false, default: 1})
    priority: number; //higher number = higher priority (e.g. admin = 999, user = 1, editor = 500)
}