import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserRole } from "./user-role.entity";

@Injectable()
export class UserRoleService {
  constructor(@InjectRepository(UserRole) private readonly userRoleRepository: Repository<UserRole>) { }

  async create(role: string, priority: number = 1): Promise<UserRole> {
    //Check if role already exists
    if(await this.roleExists(role)) {
      throw new Error(`Role '${role}' already exists`);
    }

    const newRole = this.userRoleRepository.create({ role, priority });
    await this.userRoleRepository.save(newRole);
    return newRole;
  }

  async roleExists(role: string): Promise<boolean> {
    const existingRole = await this.userRoleRepository.findOne({ where: { role } });
    return !!existingRole;
  }
  
  async findOne(role: string): Promise<UserRole> {
    const userRole = await this.userRoleRepository.findOne({ where: { role } });
    if (!userRole) {
      throw new Error(`Role '${role}' not found`);
    }
    return userRole;
  }

  async findAll(): Promise<UserRole[]> {
    return this.userRoleRepository.find();
  }


  //TODO
  async modifyRole(){

  }
}