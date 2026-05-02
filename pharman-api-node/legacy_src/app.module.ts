import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { ProduitsModule } from './produits/produits.module';
import { BiModule } from './bi/bi.module';

import { StockModule } from './stock/stock.module';

@Module({
  imports: [DatabaseModule, ProduitsModule, BiModule, StockModule],
})
export class AppModule { }

