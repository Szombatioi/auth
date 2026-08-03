import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as path from 'path';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { UserModule } from './user/user.module';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { UserRoleModule } from './user-role/entity/user-role.module';
import { SeederModule } from './seed/seeder.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    JwtModule.registerAsync({
  global: true,
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: async (configService: ConfigService) => {
    const secret = configService.get<string>('JWT_SECRET');
    return {
      secret: secret,
      signOptions: {
        expiresIn: configService.get<string>('JWT_ACCESS_EXPIRES', '15m') as JwtSignOptions['expiresIn'],
      },
    };
  },
}),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): TypeOrmModuleOptions => ({
        type: (configService.get<string>('DB_TYPE', 'postgres') as any),
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get<string>('DB_USERNAME', 'auth_admin'),
        password: configService.get<string>('DB_PASSWORD', 'auth_admin'),
        database: configService.get<string>('DB_DATABASE', 'auth_db'),
        entities: [path.join(__dirname, '**', '*.entity{.ts,.js}')],
        synchronize: true,
      }),
    }),
    UserModule,
    UserRoleModule,
    AuthModule,
    SeederModule
  ]
})
export class AppModule { }
