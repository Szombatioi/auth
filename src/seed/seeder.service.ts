import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { UserRole } from "src/user-role/entity/user-role.entity";
import { User } from "src/user/entities/user.entity";
import { Repository } from "typeorm";
import * as bcrypt from 'bcrypt';

Injectable()
export class SeederService {
    constructor(
        @InjectRepository(User) private readonly userRepository: Repository<User>,
        @InjectRepository(UserRole) private readonly userRoleRepository: Repository<UserRole>
    ) { }

    async seed(){
        await this.seedAdmin();
        await this.seedRoles();
    }

    async seedAdmin() {
        //Check for existing admin
        const existingAdmin = await this.userRepository.findOne({ where: { email: 'admin@admin.com' } });
        if (!existingAdmin) {
            const admin = this.userRepository.create({
                email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@admin.com',
                password: await bcrypt.hash(process.env.DEFAULT_ADMIN_PASSWORD || 'admin123', 10), //default password, should be changed immediately
                username: process.env.DEFAULT_ADMIN_USERNAME || 'admin',
                firstName: process.env.DEFAULT_ADMIN_FIRST_NAME ||'Admin',
                lastName: process.env.DEFAULT_ADMIN_LAST_NAME ||'User',
                //we won't set roles here, we'll do it in the seedRoles method
            });
            await this.userRepository.save(admin);
        }
    }

    async seedRoles() {
        //Check for existing roles
        const existingAdminRole = await this.userRoleRepository.findOne({ where: { role: 'admin' } });
        if (!existingAdminRole) {
            const adminRole = this.userRoleRepository.create({ role: 'admin', priority: 999 });
            await this.userRoleRepository.save(adminRole);
        }

        const existingUserRole = await this.userRoleRepository.findOne({ where: { role: 'user' } });
        if (!existingUserRole) {
            const userRole = this.userRoleRepository.create({ role: 'user', priority: 1 });
            await this.userRoleRepository.save(userRole);
        }

        //Set admin & user role to admin user (if it exists and doesn't have it already)
        const adminUser = await this.userRepository.findOne({
            where: { username: 'admin' }, relations: {
                roles: true
            }
        });

        if(!adminUser)
            return;

        if (!adminUser.roles.some(role => role.role === 'admin')) {
            const adminRole = await this.userRoleRepository.findOneOrFail({ where: { role: 'admin' } });
            adminUser.roles.push(adminRole);
            await this.userRepository.save(adminUser);
        }

        if (!adminUser.roles.some(role => role.role === 'user')){
            const userRole = await this.userRoleRepository.findOneOrFail({ where: { role: 'user' } });
            adminUser.roles.push(userRole);
            await this.userRepository.save(adminUser);
        }

    }
}