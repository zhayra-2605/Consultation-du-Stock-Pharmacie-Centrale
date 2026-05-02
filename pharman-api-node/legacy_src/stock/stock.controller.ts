import { Controller, Get, Query, Param } from '@nestjs/common';
import { StockService } from './stock.service';

@Controller('api')
export class StockController {
    constructor(private readonly stockService: StockService) { }

    @Get('search')
    async search(@Query('critere') critere: string, @Query('valeur') valeur: string) {
        return this.stockService.search(critere, valeur);
    }

    @Get('produits-par-besoin/:codeBesoin')
    async getProduitsParBesoin(@Param('codeBesoin') codeBesoin: string) {
        return this.stockService.getProduitsParBesoin(codeBesoin);
    }

    @Get('stock-summary/:codeProduit')
    async getStockSummary(@Param('codeProduit') codeProduit: string) {
        return this.stockService.getStockSummary(codeProduit);
    }

    @Get('stock-details/:codeProduit/:depot')
    async getStockDetails(@Param('codeProduit') codeProduit: string, @Param('depot') depot: string) {
        return this.stockService.getStockDetails(codeProduit, depot);
    }
}
