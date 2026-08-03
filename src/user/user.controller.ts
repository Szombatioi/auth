import { Controller, Get, Patch, Param, UseGuards, Req, Res, Body, ForbiddenException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthGuard } from 'src/guards/auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { Roles } from 'src/decorators/roles.decorator';
import { clearAuthCookies } from 'src/auth/cookie.util';
import { UserTokenPayload } from 'src/types/user-token-payload';

@Controller()
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly configService: ConfigService,
  ) {}

  @Get('profile/:id')
  getProfile(@Param('id') id: string) {
    return this.userService.getProfile(id);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  @Get()
  findAll() {
    return this.userService.findAll();
  }

  @UseGuards(AuthGuard)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Req() req: Request & { user: UserTokenPayload },
    @Res({ passthrough: true }) res: Response,
  ) {
    if (req.user.id !== id && !req.user.roles.includes('admin')) {
      throw new ForbiddenException('You can only modify your own profile');
    }

    const { profile, passwordChanged } = await this.userService.update(id, updateUserDto);

    //The password change already revoked every refresh token, so drop this
    //session's cookies too instead of leaving a dead access token behind.
    //Only when users change their own password - an admin acting on someone
    //else must not be logged out.
    if (passwordChanged && req.user.id === id) {
      clearAuthCookies(res, this.configService);
    }

    return profile;
  }

  @UseGuards(AuthGuard)
  @Get('me')
  getMe(@Req() req: Request & { user: UserTokenPayload }) {
    return this.userService.getProfile(req.user.id);
  }

  //TODO
  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.userService.remove(+id);
  // }
}
