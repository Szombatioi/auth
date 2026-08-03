import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

//Must be a class, not an interface: ValidationPipe needs a runtime metatype,
//and `import type` would erase it entirely
export class LoginDto {
    @IsEmail()
    email: string;

    @IsString()
    @IsNotEmpty()
    password: string;
}
