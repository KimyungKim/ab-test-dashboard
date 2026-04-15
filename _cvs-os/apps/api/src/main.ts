import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { HttpExceptionFilter } from './common/filters/http-exception.filter'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.enableCors()
  app.setGlobalPrefix('api')
  app.useGlobalFilters(new HttpExceptionFilter())
  const port = process.env.PORT ?? 3001
  await app.listen(port)
  console.log(`API server running on port ${port}`)
}

bootstrap()
