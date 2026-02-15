import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SeederService } from './seed/seeder.service';

async function bootstrap() {
  console.log(__dirname)
  const app = await NestFactory.create(AppModule);

  const seederService = app.get(SeederService);
  await seederService.seed();

  await app.listen(process.env.PORT ?? 8888);
}
bootstrap();
