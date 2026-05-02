import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { Pool, RowDataPacket } from 'mysql2/promise';

@Injectable()
export class BiService {
  private readonly pool: Pool;

  constructor(private readonly databaseService: DatabaseService) {
    this.pool = this.databaseService.getPool();
  }

  // --- Consultation des stocks ---

  // Stock global par produit
  async getStockGlobal() {
    const sql = `
      SELECT
        CODE_PRODUIT AS code_produit,
        LIBELLE_PRODUIT AS libelle_produit,
        SUM(stock) AS stock_total
      FROM consulter_stock
      GROUP BY CODE_PRODUIT, LIBELLE_PRODUIT
      ORDER BY LIBELLE_PRODUIT
    `;

    const [rows] = await this.pool.query<RowDataPacket[]>(sql);
    return rows;
  }

  // Stock pour un produit donné (par code)
  async getStockByProduct(codeProduit: string) {
    const sql = `
      SELECT
        CODE_PRODUIT AS code_produit,
        LIBELLE_PRODUIT AS libelle_produit,
        stock,
        QUARANTAINE AS quarantaine,
        QTEBLK AS qte_bloquee
      FROM consulter_stock
      WHERE CODE_PRODUIT = ?
    `;

    const [rows] = await this.pool.query<RowDataPacket[]>(sql, [codeProduit]);
    return rows;
  }

  // Stock agrégé par région / dépôt
  async getStockByRegion() {
    const sql = `
      SELECT
        LIBELLE_DEPOT AS region,
        SUM(STOCK_TOTAL) AS stock_total,
        SUM(QUARANTAINE) AS quarantaine,
        SUM(QTEBLK) AS qte_bloquee,
        SUM(VENTE_TOTAL) AS vente_total
      FROM stock_depot
      GROUP BY LIBELLE_DEPOT
      ORDER BY LIBELLE_DEPOT
    `;

    const [rows] = await this.pool.query<RowDataPacket[]>(sql);
    return rows;
  }

  // Stock par région et produit, avec séparation hôpitaux/officines
  async getStockByRegionAndProduct() {
    const sql = `
      SELECT
        LIBELLE_DEPOT AS region,
        CODEPRODUIT AS code_produit,
        LIBELLE AS libelle_produit,
        TYPE_STOCK AS type_stock, -- 'HOPITAL' ou 'OFFICINE' par exemple
        SUM(STOCK) AS stock,
        SUM(QUARANTAINE) AS quarantaine,
        SUM(QTEBLK) AS qte_bloquee
      FROM vue_stock_region_produit
      GROUP BY LIBELLE_DEPOT, CODEPRODUIT, LIBELLE, TYPE_STOCK
      ORDER BY LIBELLE_DEPOT, LIBELLE
    `;

    // NOTE: cette vue 'vue_stock_region_produit' est à créer côté base si elle n'existe pas encore.
    const [rows] = await this.pool.query<RowDataPacket[]>(sql);
    return rows;
  }

  // --- Analyses statistiques ---

  // Statistiques ventes / stocks N-1, N-2, N-3 et 3 premiers mois de l'année courante
  async getSalesAndStockStats() {
    const currentYear = new Date().getFullYear();
    const years = [currentYear - 1, currentYear - 2, currentYear - 3];

    const sqlYear = `
      SELECT
        annee,
        SUM(vente_total) AS ventes,
        SUM(stock_moyen) AS stock_moyen
      FROM vue_stats_annuelles
      WHERE annee IN (?, ?, ?)
      GROUP BY annee
      ORDER BY annee DESC
    `;

    const [yearRows] = await this.pool.query<RowDataPacket[]>(sqlYear, years);

    const sqlMonths = `
      SELECT
        mois,
        SUM(vente_total) AS ventes,
        SUM(stock_moyen) AS stock_moyen
      FROM vue_stats_mensuelles
      WHERE annee = ?
        AND mois BETWEEN 1 AND 3
      GROUP BY mois
      ORDER BY mois
    `;

    const [monthRows] = await this.pool.query<RowDataPacket[]>(sqlMonths, [currentYear]);

    return {
      years: yearRows,
      firstQuarter: monthRows,
    };
  }

  // Analyse des ventes par région
  async getSalesByRegion() {
    const sql = `
      SELECT
        region,
        SUM(vente_total) AS vente_total
      FROM vue_ventes_region
      GROUP BY region
      ORDER BY region
    `;

    const [rows] = await this.pool.query<RowDataPacket[]>(sql);
    return rows;
  }

  // Analyse du stock par région
  async getStockAnalysisByRegion() {
    const sql = `
      SELECT
        region,
        SUM(stock_disponible) AS stock_disponible,
        SUM(stock_quarantaine) AS stock_quarantaine,
        SUM(stock_bloque) AS stock_bloque
      FROM vue_stock_region
      GROUP BY region
      ORDER BY region
    `;

    const [rows] = await this.pool.query<RowDataPacket[]>(sql);
    return rows;
  }

  // --- Tableaux de bord & KPI ---

  async getDashboardSummary() {
    const [stockRows] = await this.pool.query<RowDataPacket[]>(
      'SELECT SUM(stock) AS stock_total FROM consulter_stock',
    );

    const stockTotalValue = stockRows[0]?.stock_total ?? 0;

    const [critiqueRows] = await this.pool.query<RowDataPacket[]>(
      'SELECT SUM(QUARANTAINE) AS quarantaine, SUM(QTEBLK) AS qte_bloquee FROM stock_depot',
    );

    const quarantaine = Number(critiqueRows[0]?.quarantaine ?? 0);
    const qteBloquee = Number(critiqueRows[0]?.qte_bloquee ?? 0);

    const [venteRows] = await this.pool.query<RowDataPacket[]>(
      'SELECT SUM(VENTE_TOTAL) AS vente_total FROM stock_depot',
    );

    const venteTotal = Number(venteRows[0]?.vente_total ?? 0);

    return {
      stockTotal: Number(stockTotalValue),
      venteTotal,
      quarantaine,
      qteBloquee,
    };
  }
}

