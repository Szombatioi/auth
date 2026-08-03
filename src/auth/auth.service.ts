import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, LessThan, Repository } from 'typeorm';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { RefreshToken } from './entities/refresh-token.entity';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { UserService } from 'src/user/user.service';
import { User } from 'src/user/entities/user.entity';
import { refreshTokenDays } from './cookie.util';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(RefreshToken) private readonly refreshTokenRepository: Repository<RefreshToken>,
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) { }

  async register(createUserDto: CreateUserDto) {
    const user = await this.userService.register(createUserDto);
    return this.issueSession(user);
  }

  async login(loginDto: LoginDto) {
    const user = await this.userService.findByEmail(loginDto.email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    //findByEmail does not join roles, and the access token payload needs them
    const fullUser = await this.userService.findById(user.id);
    return this.issueSession(fullUser!);
  }

  //Exchanges a refresh token for a fresh pair, invalidating the presented one
  async rotate(presentedToken: string | undefined) {
    if (!presentedToken) {
      throw new UnauthorizedException('No refresh token provided');
    }

    const stored = await this.refreshTokenRepository.findOne({
      where: { tokenHash: this.hash(presentedToken) },
    });
    if (!stored) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    //Already rotated or revoked, yet someone still holds it - treat the whole
    //chain as compromised and force a new login
    if (stored.revokedAt) {
      await this.revokeFamily(stored.familyId);
      throw new UnauthorizedException('Refresh token reuse detected');
    }

    if (stored.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    const user = await this.userService.findById(stored.userId);
    if (!user) {
      await this.revokeFamily(stored.familyId);
      throw new UnauthorizedException('Invalid refresh token');
    }

    const { token, entity } = this.buildRefreshToken(user.id, stored.familyId);

    //One transaction so a crash cannot leave the family with two live tokens or none
    await this.dataSource.transaction(async manager => {
      const saved = await manager.save(RefreshToken, entity);
      await manager.update(RefreshToken, stored.id, {
        revokedAt: new Date(),
        replacedByTokenId: saved.id,
      });
    });

    await this.cleanupExpired();

    return {
      accessToken: await this.issueAccessToken(user),
      refreshToken: token,
      profile: this.userService.toProfile(user),
    };
  }

  //Idempotent on purpose - logging out twice is not an error
  async logout(presentedToken: string | undefined) {
    if (!presentedToken) {
      return;
    }
    await this.refreshTokenRepository.update(
      { tokenHash: this.hash(presentedToken), revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  async logoutAll(userId: string) {
    await this.userService.revokeAllRefreshTokens(userId);
  }

  private async issueSession(user: User) {
    await this.cleanupExpired();

    //Every login starts its own family, so revoking one compromised chain
    //does not knock out the user's other devices
    const { token, entity } = this.buildRefreshToken(user.id, randomUUID());
    await this.refreshTokenRepository.save(entity);

    return {
      accessToken: await this.issueAccessToken(user),
      refreshToken: token,
      profile: this.userService.toProfile(user),
    };
  }

  private issueAccessToken(user: User) {
    return this.jwtService.signAsync({
      id: user.id,
      email: user.email,
      roles: user.roles?.map(role => role.role) ?? [],
    });
  }

  //Returns the plaintext token alongside the row - only the hash is ever persisted
  private buildRefreshToken(userId: string, familyId: string) {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + refreshTokenDays(this.configService) * 24 * 60 * 60 * 1000);

    const entity = this.refreshTokenRepository.create({
      tokenHash: this.hash(token),
      familyId,
      userId,
      expiresAt,
      revokedAt: null,
      replacedByTokenId: null,
    });

    return { token, entity };
  }

  private revokeFamily(familyId: string) {
    return this.refreshTokenRepository.update(
      { familyId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  //Opportunistic sweep on login/refresh - cheap enough at this traffic level
  //that it beats pulling in a scheduler
  private cleanupExpired() {
    return this.refreshTokenRepository.delete({ expiresAt: LessThan(new Date()) });
  }

  private hash(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}
