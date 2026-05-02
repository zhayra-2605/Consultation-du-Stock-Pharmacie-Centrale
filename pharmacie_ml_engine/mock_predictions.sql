-- Mock ML Data just to verify the UI while pip installs scipy
INSERT INTO ml_predictions_cache 
(hub_id, code_besoin, label_besoin, periode_mois, prediction_couverture, risque_rupture_prob, rupture_predite, trend, days_to_stockout)
VALUES 
('TUNIS', 'B_URG_01', 'Adrénaline 1mg', 3, 12, 0.85, 1, 'down', 14),
('SFAX', 'B_ONC_02', 'Cisplatine 50mg', 3, 22, 0.65, 1, 'down', 25),
('SOUSSE', 'B_CARD_03', 'Amiodarone', 3, 45, 0.2, 0, 'stable', 120),
('GAFSA', 'B_DIAB_04', 'Insuline Rapide', 3, 5, 0.95, 1, 'down', 3),
('KEF', 'B_ANTI_05', 'Amoxicilline 1g', 3, 85, 0.05, 0, 'up', 999),
('MEDENINE', 'B_ANEST_06', 'Propofol', 3, 28, 0.55, 1, 'down', 35);
