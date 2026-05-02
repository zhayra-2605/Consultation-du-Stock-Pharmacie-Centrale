import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { RowDataPacket } from 'mysql2';

@Injectable()
export class StockService {
  constructor(private readonly dbService: DatabaseService) {}

  async search(critere: string, valeur: string) {
    let query = 'SELECT * FROM consulter_stock WHERE 1=1';
    const params: any[] = [];

    if (critere && valeur) {
      switch (critere) {
        case 'Code Produit':
          query += ' AND CODE_PRODUIT LIKE ?';
          params.push(`%${valeur}%`);
          break;
        case 'Libellé Produit':
          query += ' AND LIBELLE_PRODUIT LIKE ?';
          params.push(`%${valeur}%`);
          break;
        case 'Code Besoin':
          query += ' AND CODE_BESOIN LIKE ?';
          params.push(`%${valeur}%`);
          break;
        case 'Libellé Besoin':
          query += ' AND LIBELLE_BESOIN LIKE ?';
          params.push(`%${valeur}%`);
          break;
      }
    }

    const [rows] = await this.dbService.getPool().query<RowDataPacket[]>(query, params);
    return rows;
  }

  async getProduitsParBesoin(codeBesoin: string) {
    const query = 'SELECT * FROM details_produit WHERE CODEBESOIN = ?';
    const [rows] = await this.dbService.getPool().query<RowDataPacket[]>(query, [codeBesoin]);
    return rows;
  }

  async getStockSummary(codeProduit: string) {
    const query = `
      SELECT 
        LIBELLE_DEPOT, 
        SUM(STOCK_TOTAL) as total_stock 
      FROM stock_depot 
      WHERE CODE_PRODUIT = ? 
      GROUP BY LIBELLE_DEPOT
    `;
    const [rows] = await this.dbService.getPool().query<RowDataPacket[]>(query, [codeProduit]);
    
    // Map existing depots to ensure we have data for all buttons even if 0
    const depots = ['National', 'Réserve', 'Tunis', 'Sousse', 'Sfax', 'Medenine', 'Gafsa', 'Kef'];
    const result = depots.map(depot => {
      const found = rows.find(r => r.LIBELLE_DEPOT === depot || (depot === 'Réserve' && r.LIBELLE_DEPOT.includes('RESERVE')));
      return {
        depot,
        stock: found ? found.total_stock : 0
      };
    });

    return result;
  }

  async getStockDetails(codeProduit: string, depot: string) {
    let depotFilter = 'LIBELLE_DEPOT = ?';
    if (depot === 'Réserve') {
        depotFilter = 'LIBELLE_DEPOT LIKE "%RESERVE%"';
    }

    const query = `
      SELECT 
        CODE_PRODUIT as Code_Produit,
        LIBELLE_PRODUIT as Libellé,
        LIBELLE_DEPOT as Dépôt,
        NUM_LOT as Num_lot,
        DATE_PEREMPTION as Date_péremption,
        STOCK as Stock,
        QTE_BLOQUEE as Qte_bloquée,
        QUARANTAINE as Quarantaine,
        STOCK_TOTAL as Stock_total,
        VENTE_TOTAL as Vente_total
      FROM stock_depot 
      WHERE CODE_PRODUIT = ? AND ${depotFilter}
    `;
    
    const params = depot === 'Réserve' ? [codeProduit] : [codeProduit, depot];
    const [rows] = await this.dbService.getPool().query<RowDataPacket[]>(query, params);
    return rows;
  }
}
