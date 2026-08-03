import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SeederService } from './seed/seeder.service';

async function bootstrap() {
  console.log(__dirname)
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.ENABLED_URLS?.split(",") || 'http://localhost:3000',
    credentials: true,
  });

  const seederService = app.get(SeederService);
  await seederService.seed();

  await app.listen(process.env.PORT ?? 8888);
}
bootstrap();
