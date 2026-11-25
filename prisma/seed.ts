import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed for Talkar Universal Sales CRM (Prestige Group Only)...');

  // 1. Remove all non-Prestige demo companies (Clove Dental, GuruG, etc.)
  const deleted = await prisma.company.deleteMany({
    where: { slug: { not: 'prestige-group' } }
  });
  console.log(`🧹 Cleaned up ${deleted.count} non-Prestige companies.`);

  // 2. REAL ESTATE: Prestige Group
  const prestige = await prisma.company.upsert({
    where: { slug: 'prestige-group' },
    update: {
      name: 'Prestige Group Luxury Estates',
      brand: 'Prestige',
      industry: 'REAL_ESTATE',
      tagline: 'Crafting Bangalore & Mumbai’s Most Exclusive Gated Communities',
      description: 'Ultra-luxury residential projects, gated villa communities, and prime penthouses.',
      phone: '+918025591080',
      email: 'sales@prestige-group.com',
      website: 'https://prestigeconstructions.com',
      address: 'Prestige Falcon Tower, Brunton Road',
      city: 'Bangalore',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      offeringNoun: 'Villa & Apartment Configuration',
      appointmentNoun: 'Site Visit & VIP Cab Pickup',
    },
    create: {
      slug: 'prestige-group',
      name: 'Prestige Group Luxury Estates',
      brand: 'Prestige',
      industry: 'REAL_ESTATE',
      tagline: 'Crafting Bangalore & Mumbai’s Most Exclusive Gated Communities',
      description: 'Ultra-luxury residential projects, gated villa communities, and prime penthouses.',
      phone: '+918025591080',
      email: 'sales@prestige-group.com',
      website: 'https://prestigeconstructions.com',
      address: 'Prestige Falcon Tower, Brunton Road',
      city: 'Bangalore',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      offeringNoun: 'Villa & Apartment Configuration',
      appointmentNoun: 'Site Visit & VIP Cab Pickup',
      offerings: {
        create: [
          {
            code: 'PRESTIGE-2BHK',
            title: '2BHK Premium Lakeview Apartment',
            category: '2BHK',
            description: '1,280 sq ft lake-facing residence with Italian marble flooring and private sun-deck.',
            price: 9500000,
            currency: 'INR',
            specs: JSON.stringify({ sqft: 1280, facing: 'North-East', possession: 'Ready to Move', clubAccess: true }),
            photos: JSON.stringify(['https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80']),
            brochureUrl: '/brochures/prestige-2bhk-lakeview.pdf',
          },
          {
            code: 'PRESTIGE-3BHK-LUX',
            title: '3BHK Luxury Garden Villa with Private Terrace',
            category: '3BHK Villa',
            description: '2,450 sq ft duplex villa with private lawn, double-height living room, and modular kitchen.',
            price: 18500000,
            currency: 'INR',
            specs: JSON.stringify({ sqft: 2450, facing: 'East', possession: 'March 2027', parking: '2 Covered Slots' }),
            photos: JSON.stringify(['https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=80']),
            brochureUrl: '/brochures/prestige-3bhk-garden-villa.pdf',
          },
          {
            code: 'PRESTIGE-4BHK-PENT',
            title: '4BHK Sky Penthouse with Heated Plunge Pool',
            category: 'Penthouse',
            description: '4,100 sq ft panoramic penthouse on 32nd floor with 360-degree skyline views and dedicated elevator access.',
            price: 34000000,
            currency: 'INR',
            specs: JSON.stringify({ sqft: 4100, facing: 'East', floor: 32, privatePool: true }),
            photos: JSON.stringify(['https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80']),
            brochureUrl: '/brochures/prestige-4bhk-sky-penthouse.pdf',
          },
        ],
      },
    },
  });

  // Ensure brochure URLs are set for Prestige offerings
  await prisma.offering.updateMany({
    where: { companyId: prestige.id, code: 'PRESTIGE-2BHK' },
    data: { brochureUrl: '/brochures/prestige-2bhk-lakeview.pdf' }
  });
  await prisma.offering.updateMany({
    where: { companyId: prestige.id, code: 'PRESTIGE-3BHK-LUX' },
    data: { brochureUrl: '/brochures/prestige-3bhk-garden-villa.pdf' }
  });
  await prisma.offering.updateMany({
    where: { companyId: prestige.id, code: 'PRESTIGE-4BHK-PENT' },
    data: { brochureUrl: '/brochures/prestige-4bhk-sky-penthouse.pdf' }
  });

  // Check if Prestige already has sample leads
  const prestigeLeadCount = await prisma.lead.count({
    where: { companyId: prestige.id }
  });

  if (prestigeLeadCount === 0) {
    await prisma.lead.create({
      data: {
        companyId: prestige.id,
        name: 'Arnav Patnaik',
        phone: '+919827953551',
        email: 'arnav.p@rediffmail.com',
        city: 'Bangalore',
        temperature: 'HOT',
        stage: 'APPOINTMENT_BOOKED',
        budget: '1.8 - 2.0 Cr',
        timeline: 'Within 60 Days',
        need: 'Looking for 3BHK duplex villa with east-facing garden for family.',
        authority: 'Decision maker with self-funded capital',
        summary: 'Spoke with Prestige Voice Concierge. Loved the Garden Villa pricing. Booked Saturday morning VIP site visit with cab pickup.',
        recordingUrl: null,
        callRunId: 'WR-89102',
        appointments: {
          create: {
            companyId: prestige.id,
            reference: 'VISIT-4821',
            type: 'Site Visit & VIP Cab Pickup',
            date: '2026-11-28',
            timeSlot: '11:30 AM',
            status: 'SCHEDULED',
            notes: 'Guest requested cab pickup from Indiranagar Metro Station. Interested in Villa #42.',
          },
        },
      },
    });

    await prisma.lead.create({
      data: {
        companyId: prestige.id,
        name: 'Sunita Rao',
        phone: '+919845012345',
        email: 'sunita.rao@gmail.com',
        city: 'Bangalore',
        temperature: 'WARM',
        stage: 'QUALIFIED',
        budget: '90 - 95 Lakhs',
        timeline: 'Next Quarter',
        need: 'Inquiring about 2BHK Lakeview unit. Asking for bank loan tie-ups with HDFC and SBI.',
        summary: 'Qualified lead. Sent 2BHK floor plans on WhatsApp. Scheduled a callback for Tuesday 5 PM.',
        callbackAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        callbackReason: 'Requested callback after discussing down payment with spouse.',
      },
    });
  }

  console.log(`✨ Seed completed successfully! Only Prestige Group Luxury Estates is active.`);
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
