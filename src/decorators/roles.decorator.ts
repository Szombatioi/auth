import { SetMetadata } from "@nestjs/common";

export const ROLES_KEY = 'roles';

//Marks a route as requiring at least one of the listed roles.
//Only has an effect when RolesGuard is applied after AuthGuard.
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
