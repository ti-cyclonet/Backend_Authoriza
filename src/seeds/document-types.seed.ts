import { DataSource } from 'typeorm';

export const documentTypesSeed = async (dataSource: DataSource) => {
  console.log('Document types are seeded via migration 1756829474482');
  // Los tipos de documento se insertan directamente en la migración
  // para garantizar que estén disponibles desde el primer momento
};