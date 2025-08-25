import { Contract } from 'src/contract/entities/contract.entity';
import { ContractStatus } from 'src/contract/enums/contract-status.enum';
import { PaymentMode } from 'src/contract/enums/payment-mode.enum';
import { DataSource } from 'typeorm';

export async function seedContracts(dataSource: DataSource) {
  const repo = dataSource.getRepository(Contract);

  const contract = repo.create({
    startDate: new Date(),
    endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
    payday: 5,
    mode: PaymentMode.MONTHLY,
    status: ContractStatus.ACTIVE,
    user: { id: 'UUID-DE-USUARIO' },
    package: { id: 'UUID-DE-PAQUETE' },
  });

  await repo.save(contract);
  console.log('✅ Contracts seeded');
}
