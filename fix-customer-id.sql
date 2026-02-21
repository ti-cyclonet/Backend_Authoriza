-- Ejecutar este script en la base de datos AuthorizaDB
ALTER TABLE "customer_parameters_periods" 
ALTER COLUMN "customer_id" DROP NOT NULL;
