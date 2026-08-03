import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "src/decorators/roles.decorator";
import { UserTokenPayload } from "src/types/user-token-payload";

//Must run after AuthGuard, which @UseGuards(AuthGuard, RolesGuard) guarantees
//(guards execute left to right). Roles come from the access token payload, so
//they can be at most one access-token lifetime stale.
@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!requiredRoles?.length) {
            return true;
        }

        const user: UserTokenPayload | undefined = context.switchToHttp().getRequest().user;
        if (!user?.roles?.some(role => requiredRoles.includes(role))) {
            throw new ForbiddenException('Insufficient permissions');
        }
        return true;
    }
}
