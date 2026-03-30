import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'AuthorizaDB',
});

async function run() {
  await dataSource.initialize();
  await dataSource.query('ALTER TABLE "customer_parameters_periods" DROP COLUMN IF EXISTS "customer_id"');
  console.log('Columna customer_id eliminada exitosamente');
  await dataSource.destroy();
}

run().catch(console.error);
