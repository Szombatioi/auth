import { TypeOrmModule } from "@nestjs/typeorm";
import { UserRole } from "src/user-role/entity/user-role.entity";
import { User } from "src/user/entities/user.entity";
import { SeederService } from "./seeder.service";
import { Module } from "@nestjs/common";

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserRole])
  ],
  providers: [SeederService],
  exports: [SeederService]

})
export class SeederModule {}