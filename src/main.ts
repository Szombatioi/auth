import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { SeederService } from './seed/seeder.service';

async function bootstrap() {
  // console.log(__dirname)
  const app = await NestFactory.create(AppModule);

  //For request.cookies
  app.use(cookieParser());

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  app.enableCors({
    origin: process.env.ENABLED_URLS?.split(",") || 'http://localhost:3000',
    credentials: true,
  });

  const seederService = app.get(SeederService);
  await seederService.seed();

  await app.listen(process.env.PORT ?? 8888);
}
bootstrap();
