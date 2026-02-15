import { TypeOrmModule } from "@nestjs/typeorm";
import { UserRole } from "./user-role.entity";
import { Module } from '@nestjs/common';
import { UserRoleService } from "./user-role.service";
import { UserRoleController } from "./user-role.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([UserRole])
  ],
  controllers: [UserRoleController],
  providers: [UserRoleService],
  exports: [UserRoleService]
})
export class UserRoleModule {}