import { User } from "src/user/entities/user.entity";
import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

//One row per issued refresh token.
//The token itself is never stored - only its SHA-256 hash, so a database leak
//does not hand out working sessions.
@Entity()
export class RefreshToken {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    //SHA-256 of the opaque token, hex encoded (64 chars).
    //Not bcrypt: bcrypt is salted, so it cannot be looked up with a WHERE clause.
    //SHA-256 is safe here because the token is 32 bytes of CSPRNG output.
    @Index({ unique: true })
    @Column({ type: 'char', length: 64 })
    tokenHash: string;

    //Every login starts a new family; rotation carries the same familyId forward.
    //If an already-rotated token is replayed, the whole family gets revoked.
    @Index()
    @Column({ type: 'uuid' })
    familyId: string;

    @Index()
    @Column({ type: 'uuid' })
    userId: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: false })
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column({ type: 'timestamptz' })
    expiresAt: Date;

    //Set when the token is rotated away or explicitly revoked (logout)
    @Column({ type: 'timestamptz', nullable: true })
    revokedAt: Date | null;

    //The token that replaced this one during rotation
    @Column({ type: 'uuid', nullable: true })
    replacedByTokenId: string | null;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt: Date;
}
