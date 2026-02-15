import { Body, Controller, Get, Post } from "@nestjs/common";
import { UserRoleService } from "./user-role.service";

@Controller('role')
export class UserRoleController {
    constructor(private readonly userRoleService: UserRoleService) { }

    @Post()
    async createRole(@Body('role') role: string) {
        return await this.userRoleService.create(role);
    }

    @Get()
    async findAll() {
        return await this.userRoleService.findAll();
    }
}