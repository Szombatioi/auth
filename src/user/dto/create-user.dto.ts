import { Gender } from '../entities/gender.enum';

export class CreateUserDto {
    email: string;
    password: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    profilePictureUrl?: string;
    gender?: Gender;
    birthDate?: Date;
}
