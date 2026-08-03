import { BadRequestException, Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { IsNull, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserRole } from 'src/user-role/entity/user-role.entity';
import { UserRoleService } from 'src/user-role/entity/user-role.service';
import { RefreshToken } from 'src/auth/entities/refresh-token.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    //Injected directly rather than going through AuthService, which would make
    //UserModule and AuthModule depend on each other
    @InjectRepository(RefreshToken) private readonly refreshTokenRepository: Repository<RefreshToken>,
    private readonly userRoleService: UserRoleService,
  ) { }

  async register(createUserDto: CreateUserDto) {
    //If email or password is missing, throw an error (should not happen...)
    if (!createUserDto.email || !createUserDto.password) {
      throw new BadRequestException('Email and password are required');
    }

    //Check for user with the same email
    const existingUser = await this.findByEmail(createUserDto.email);
    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    //Check for user with the same username
    if (createUserDto.username) {
      const existingUsername = await this.userRepository.findOne({ where: { username: createUserDto.username } });
      if (existingUsername) {
        throw new BadRequestException('User with this username already exists');
      }
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const newUser = this.userRepository.create({
        ...createUserDto,
        password: hashedPassword,
      });
      
    //add 'user' role by default
    let defaultRole = await this.userRoleService.findOne('user');
    if(!defaultRole) { //fallback: create role
      await this.userRoleService.create('user');
      defaultRole = await this.userRoleService.findOne('user');
    }
    newUser.roles = [defaultRole];

    await this.userRepository.save(newUser);

    //AuthService turns this into a token pair - registration still logs the user in
    return newUser;
  }

  //TODO: pagination
  async findAll() {
    const users = await this.userRepository.find({ relations: ['roles'] });
    return users.map(user => this.toProfile(user));
  }

  // findOne(id: number) {
  //   return `This action returns a #${id} user`;
  // }

  findByEmail(email: string) {
    return this.userRepository.findOne({ where: { email } });
  }

  findById(id: string) {
    return this.userRepository.findOne({ where: { id }, relations: ['roles'] });
  }

  //This function handles all possible user modifications
  //Separating these subfunctions is the task of the frontend
  async update(id: string, updateUserDto: UpdateUserDto) {
    let updated = false;
    let passwordChanged = false;

    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (updateUserDto.firstName && updateUserDto.firstName !== user.firstName) {
      user.firstName = updateUserDto.firstName;
      updated = true;
    }

    if (updateUserDto.lastName && updateUserDto.lastName !== user.lastName) {
      user.lastName = updateUserDto.lastName;
      updated = true;
    }

    if (updateUserDto.username && updateUserDto.username !== user.username) {
      const existingUsername = await this.userRepository.findOne({ where: { username: updateUserDto.username } });
      if (existingUsername && existingUsername.id !== user.id) {
        throw new BadRequestException('User with this username already exists');
      }
      user.username = updateUserDto.username;
      updated = true;
    }

    if(updateUserDto.profilePictureUrl && updateUserDto.profilePictureUrl !== user.profilePictureUrl) {
      user.profilePictureUrl = updateUserDto.profilePictureUrl;
      updated = true;
    }

    if (updateUserDto.gender !== undefined && updateUserDto.gender !== user.gender) {
      user.gender = updateUserDto.gender;
      updated = true;
    }

    if (updateUserDto.birthDate !== undefined) {
      const incoming = new Date(updateUserDto.birthDate).toISOString();
      const existing = user.birthDate ? new Date(user.birthDate).toISOString() : null;
      if (incoming !== existing) {
        user.birthDate = new Date(updateUserDto.birthDate);
        updated = true;
      }
    }

    //Changing password: verify the current password before applying the new one
    if (updateUserDto.password) {
      if (!updateUserDto.currentPassword) {
        throw new BadRequestException('Current password is required to change the password');
      }
      const currentPasswordValid = await bcrypt.compare(updateUserDto.currentPassword, user.password);
      if (!currentPasswordValid) {
        throw new UnauthorizedException('Current password is incorrect');
      }
      //Only persist if the new password actually differs from the current one
      if (!(await bcrypt.compare(updateUserDto.password, user.password))) {
        user.password = await bcrypt.hash(updateUserDto.password, 10);
        updated = true;
        passwordChanged = true;
      }
    }

    if (updated) {
      await this.userRepository.save(user);
    }

    //A password change should end every session, including the ones on other devices
    if (passwordChanged) {
      await this.revokeAllRefreshTokens(id);
    }

    return { profile: this.toProfile(user), passwordChanged };
  }

  //Used on password change and by the logout-all endpoint
  async revokeAllRefreshTokens(userId: string) {
    await this.refreshTokenRepository.update(
      { userId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  //Adds or removes a specific role to/from a user
  //Parameter: a string-boolean array, where the string is the role name and the boolean indicates whether to add (true) or remove (false) the role
  async handleRole(userId: string, roles: { role: string, add: boolean }[]){
    //Check each role if exists -> error if any role does not exist
    for(const role of roles) {
      if(!await this.userRoleService.roleExists(role.role)) {
        throw new NotFoundException(`Role '${role.role}' not found`);
      }

    const user = await this.userRepository.findOne({ where: { id: userId }, relations: ['roles'] });
    if(!user) {
      throw new NotFoundException('User not found');
    }

    if(role.add) {
      //Add role if not already assigned
      if(!user.roles.some(r => r.role === role.role)) {
        const roleEntity = await this.userRoleService.findOne(role.role);
        user.roles.push(roleEntity);
      }
    }
    else {
      //Remove role if assigned
      user.roles = user.roles.filter(r => r.role !== role.role);
    }

    await this.userRepository.save(user);
  }
  }

  // remove(id: number) {
  //   return `This action removes a #${id} user`;
  // }

  async getProfile(id: string) {
    const user = await this.findById(id);
    if(!user) {
      throw new NotFoundException('User not found');
    }
    return this.toProfile(user);
  }

  //The only shape a User may leave the service in - notably without the password hash
  toProfile(user: User) {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      profilePictureUrl: user.profilePictureUrl,
      roles: user.roles,
      gender: user.gender ?? null,
      birthDate: user.birthDate ?? null,
    };
  }
}
