import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ACCESS_COOKIE } from "src/auth/cookie.util";
import { UserTokenPayload } from "src/types/user-token-payload";

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(private readonly jwtService: JwtService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const token = request.cookies?.[ACCESS_COOKIE];
        if (!token) {
            throw new UnauthorizedException('No token provided');
        }

        try{
            const payload = await this.jwtService.verifyAsync<UserTokenPayload>(token);
            request.user = payload;
        } catch{
            throw new UnauthorizedException('Invalid or expired token');
        }
        return true;
    }
}
