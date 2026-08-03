import { Body, Controller, HttpCode, HttpStatus, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { REFRESH_COOKIE, clearAuthCookies, setAuthCookies } from './cookie.util';
import { AuthGuard } from 'src/guards/auth.guard';
import { UserTokenPayload } from 'src/types/user-token-payload';

//No controller prefix, so /login and /register keep the URLs the frontend already uses
@Controller()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  //@Res({ passthrough: true }) is required: a bare @Res() makes Nest ignore the
  //returned value, and the request would hang
  @Post('register')
  async register(@Body() createUserDto: CreateUserDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken, profile } = await this.authService.register(createUserDto);
    setAuthCookies(res, this.configService, accessToken, refreshToken);
    return profile;
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken, profile } = await this.authService.login(loginDto);
    setAuthCookies(res, this.configService, accessToken, refreshToken);
    return profile;
  }

  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    try {
      const { accessToken, refreshToken, profile } = await this.authService.rotate(req.cookies?.[REFRESH_COOKIE]);
      setAuthCookies(res, this.configService, accessToken, refreshToken);
      return profile;
    } catch (error) {
      //The cookies are worthless now either way - don't leave the client
      //retrying with a token the server has already rejected
      clearAuthCookies(res, this.configService);
      throw error;
    }
  }

  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(req.cookies?.[REFRESH_COOKIE]);
    clearAuthCookies(res, this.configService);
    return { success: true };
  }

  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('logout-all')
  async logoutAll(@Req() req: Request & { user: UserTokenPayload }, @Res({ passthrough: true }) res: Response) {
    await this.authService.logoutAll(req.user.id);
    clearAuthCookies(res, this.configService);
    return { success: true };
  }
}
