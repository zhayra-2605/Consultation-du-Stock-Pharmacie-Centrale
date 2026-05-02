import { Controller, Get } from '@nestjs/common';
import { BiService } from './bi.service';

@Controller('bi')
export class BiController {
  constructor(private readonly biService: BiService) {}

  // --- Consultation des stocks ---

  @Get('stock/global')
  getStockGlobal() {
    return this.biService.getStockGlobal();
  }

  @Get('stock/by-region')
  getStockByRegion() {
    return this.biService.getStockByRegion();
  }

  @Get('stock/by-region-product')
  getStockByRegionAndProduct() {
    return this.biService.getStockByRegionAndProduct();
  }

  // --- Analyses statistiques ---

  @Get('stats/sales-stock')
  getSalesAndStockStats() {
    return this.biService.getSalesAndStockStats();
  }

  @Get('stats/sales-by-region')
  getSalesByRegion() {
    return this.biService.getSalesByRegion();
  }

  @Get('stats/stock-by-region')
  getStockAnalysisByRegion() {
    return this.biService.getStockAnalysisByRegion();
  }

  // --- Dashboard / KPI ---

  @Get('dashboard/summary')
  getDashboardSummary() {
    return this.biService.getDashboardSummary();
  }
}

