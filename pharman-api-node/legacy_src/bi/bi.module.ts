import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { BiService } from './bi.service';
import { BiController } from './bi.controller';

@Module({
  imports: [DatabaseModule],
  providers: [BiService],
  controllers: [BiController],
})
export class BiModule {}

