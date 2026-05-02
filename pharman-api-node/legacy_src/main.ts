import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';
import { json, Request, Response, NextFunction } from 'express';

async function bootstrap() {
  dotenv.config();

  const app = await NestFactory.create(AppModule);

  // Forcer JSON UTF-8 et activer CORS comme dans le PHP
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization'
  });

  app.use(json());

  app.use((req: Request, res: Response, next: NextFunction) => {
    res.header('Content-Type', 'application/json; charset=UTF-8');
    next();
  });

  const port = process.env.PORT || 8000;
  await app.listen(port);
}

bootstrap().catch((err) => {
  // En cas d'erreur au bootstrap, imiter le comportement PHP en renvoyant un JSON d'erreur
  // (en pratique ce sera visible surtout dans les logs côté serveur)
  // eslint-disable-next-line no-console
  console.error('Bootstrap error', err);
});

