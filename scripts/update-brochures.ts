import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.offering.updateMany({
    where: { code: 'PRESTIGE-2BHK' },
    data: { brochureUrl: '/brochures/prestige-2bhk-lakeview.pdf' }
  });
  await prisma.offering.updateMany({
    where: { code: 'PRESTIGE-3BHK-LUX' },
    data: { brochureUrl: '/brochures/prestige-3bhk-garden-villa.pdf' }
  });
  await prisma.offering.updateMany({
    where: { code: 'PRESTIGE-4BHK-PENT' },
    data: { brochureUrl: '/brochures/prestige-4bhk-sky-penthouse.pdf' }
  });
  const res = await prisma.offering.findMany({ where: { company: { slug: 'prestige-group' } } });
  console.log('✅ Updated offerings:', res.map(o => ({ code: o.code, brochure: o.brochureUrl, photos: o.photos })));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
