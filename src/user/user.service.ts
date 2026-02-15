import { BadRequestException, Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { UserRole } from 'src/user-role/entity/user-role.entity';
import { UserRoleService } from 'src/user-role/entity/user-role.service';
import { RelationIdMetadataToAttributeTransformer } from 'typeorm/browser/query-builder/relation-id/RelationIdMetadataToAttributeTransformer.js';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly userRoleService: UserRoleService,
    private readonly jwtService: JwtService
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

    //Generate a JWT token to login the user immediately after registration
    return this.jwtService.signAsync({ id: newUser.id, email: newUser.email });
  }

  async login(loginDto: LoginDto) {
    const user = await this.findByEmail(loginDto.email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.jwtService.signAsync({ id: user.id, email: user.email });
  }

  //TODO: remove? or add auth guard? (+pagination)
  findAll() {
    return this.userRepository.find({ relations: ['roles'] });
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

    if(updateUserDto.profilePictureUrl && updateUserDto.profilePictureUrl !== user.profilePictureUrl) {
      user.profilePictureUrl = updateUserDto.profilePictureUrl;
      updated = true;
    }

    //Changing password endpoint
    if(updateUserDto.password && !(await bcrypt.compare(updateUserDto.password, user.password))) {
      user.password = await bcrypt.hash(updateUserDto.password, 10);
      updated = true;
    }

    if (updated) {
      await this.userRepository.save(user);
    }
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
}
