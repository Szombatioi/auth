import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { User } from './entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { UserRoleModule } from 'src/user-role/entity/user-role.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    UserRoleModule
  ],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
