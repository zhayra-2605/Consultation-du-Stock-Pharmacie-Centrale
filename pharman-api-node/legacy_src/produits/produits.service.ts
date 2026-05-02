import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { Pool, RowDataPacket } from 'mysql2/promise';

@Injectable()
export class ProduitsService {
  private readonly pool: Pool;

  constructor(private readonly databaseService: DatabaseService) {
    this.pool = this.databaseService.getPool();
  }

  // Équivalent de Produit::rechercher
  async rechercher(critere: string | undefined, valeur: string | undefined) {
    const map: Record<string, string> = {
      libelle: 'LIBELLE_PRODUIT',
      code: 'CODE_PRODUIT',
      besoin: 'CODE_BESOIN',
      libelle_besoin: 'LIBELLE_BESOIN',
    };

    const column = map[critere || 'libelle'] || 'LIBELLE_PRODUIT';
    const searchValue = valeur ?? '';

    const sql = `
      SELECT
        CODE_PRODUIT     AS code_produit,
        LIBELLE_PRODUIT  AS libelle_produit,
        CODE_BESOIN      AS code_besoin,
        LIBELLE_BESOIN   AS libelle_besoin,
        CODE_FOURNISSEUR AS code_fournisseur,
        NOM_FOURNISSEUR  AS nom_fournisseur,
        CODE_PAYS        AS code_pays,
        NOM_PAYS         AS nom_pays,
        PRESENTATION_T   AS presentation_t,
        NATURE_BESOIN    AS nature_besoin,
        INTERCHANGEABLE  AS interchangeable
      FROM consulter_stock
      WHERE ${column} LIKE ?
    `;

    const [rows] = await this.pool.query<RowDataPacket[]>(sql, [`%${searchValue}%`]);
    return rows;
  }

  // Équivalent de Produit::getDetails
  async getDetails(codeBesoin: string) {
    const sql = `
      SELECT
        CODEPRODUIT  AS codeproduit,
        LIBELLE      AS libelle,
        SIGLE        AS sigle,
        QUARANTAINE  AS quarantaine,
        STOCK        AS stock,
        ETATPRODUIT  AS etatproduit
      FROM details_produit
      WHERE CODEBESOIN = :code
         OR REPLACE(CODEBESOIN, '-', '') = REPLACE(:code, '-', '')
    `;

    // mysql2 ne supporte pas directement la notation :code,
    // on remplace par des placeholders positionnels.
    const sqlConverted = sql.replace(/:code/g, '?');
    const [rows] = await this.pool.query<RowDataPacket[]>(sqlConverted, [codeBesoin, codeBesoin]);
    return rows;
  }

  // Équivalent de Produit::getStockParDepot
  async getStockParDepot(codeBesoin: string, region?: string | null) {
    let sql = `
      SELECT
        CODE_PRODUIT       AS code_produit,
        LIBELLE       AS libelle,
        LIBELLE_DEPOT AS depot,
        NUMLOT        AS num_lot,
        DATEPEREMP    AS date_peremption,
        QUANTITET     AS stock,
        QTEBLK        AS qte_bloquee,
        QUARANTAINE   AS quarantaine,
        STOCK_TOTAL   AS stock_total,
        VENTE_TOTAL   AS vente_total
      FROM stock_depot
      WHERE REPLACE(REPLACE(CODEBESOIN, '-', ''), ' ', '') = REPLACE(REPLACE(?, '-', ''), ' ', '')
    `;
  
    const params: any[] = [codeBesoin];
  
    if (region && region !== 'National') {
      sql += ' AND LIBELLE_DEPOT = ?';
      params.push(region);
    }
  
    sql += ' ORDER BY LIBELLE_DEPOT, LIBELLE, NUMLOT';
  
    const [rows] = await this.pool.query<RowDataPacket[]>(sql, params);
    return rows;
  }

  // Équivalent de stats_ventes.php
  async getStatsVentes() {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      'SELECT SUM(stock) AS total_stock FROM consulter_stock',
    );

    const totalStockValue = rows[0]?.total_stock;
    const totalStock =
      totalStockValue !== null && totalStockValue !== undefined
        ? Number(totalStockValue)
        : 0;

    const ventes = [120, 190, 300, 250];

    return {
      stocks: [totalStock, totalStock, totalStock, totalStock],
      ventes,
    };
  }
}

