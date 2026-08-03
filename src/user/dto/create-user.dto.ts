import { Type } from 'class-transformer';
import { IsDate, IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { Gender } from '../entities/gender.enum';

//Every field needs at least one decorator: the global ValidationPipe runs with
//whitelist: true, which silently strips any property that has none
export class CreateUserDto {
    @IsEmail()
    email: string;

    @IsString()
    @MinLength(8)
    password: string;

    @IsOptional()
    @IsString()
    username?: string;

    @IsOptional()
    @IsString()
    firstName?: string;

    @IsOptional()
    @IsString()
    lastName?: string;

    @IsOptional()
    @IsString()
    profilePictureUrl?: string;

    @IsOptional()
    @IsEnum(Gender)
    gender?: Gender;

    @IsOptional()
    @Type(() => Date)
    @IsDate()
    birthDate?: Date;
}
