import { Controller, Get, Query, HttpException, HttpStatus } from '@nestjs/common';
import { ProduitsService } from './produits.service';

@Controller('endpoints')
export class ProduitsController {
  constructor(private readonly produitsService: ProduitsService) {}

  // Équivalent de endpoints/recherche.php
  @Get('recherche.php')
  async rechercher(
    @Query('critere') critere = 'libelle',
    @Query('valeur') valeur = '',
  ) {
    try {
      return await this.produitsService.rechercher(critere, valeur);
    } catch (e: any) {
      throw new HttpException(
        { error: e?.message ?? 'Erreur interne du serveur' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Équivalent de endpoints/details_stock.php
  @Get('details_stock.php')
  async detailsStock(@Query('code') code = '') {
    if (!code) {
      return [];
    }
    try {
      return await this.produitsService.getDetails(code);
    } catch (e: any) {
      throw new HttpException(
        { error: e?.message ?? 'Erreur interne du serveur' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Équivalent de endpoints/stock_depot.php
  @Get('stock_depot.php')
  async stockDepot(
    @Query('code') code = '',
    @Query('region') region = 'National',
  ) {
    if (!code) {
      return [];
    }
    try {
      return await this.produitsService.getStockParDepot(code, region);
    } catch (e: any) {
      throw new HttpException(
        { error: e?.message ?? 'Erreur interne du serveur' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Équivalent de endpoints/stats_ventes.php
  @Get('stats_ventes.php')
  async statsVentes() {
    try {
      return await this.produitsService.getStatsVentes();
    } catch (e: any) {
      throw new HttpException(
        { error: e?.message ?? 'Erreur interne du serveur' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

