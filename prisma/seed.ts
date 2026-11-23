import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed for Talkar Universal Sales CRM...');

  // 1. REAL ESTATE: Prestige Group
  const prestige = await prisma.company.upsert({
    where: { slug: 'prestige-group' },
    update: {},
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
            brochureUrl: 'https://prestigeconstructions.com/brochures/lakeview-2bhk.pdf',
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
            brochureUrl: 'https://prestigeconstructions.com/brochures/garden-villa-3bhk.pdf',
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
            brochureUrl: 'https://prestigeconstructions.com/brochures/sky-penthouse.pdf',
          },
        ],
      },
    },
  });

  // Seed sample leads for Prestige Group
  const leadPrestige1 = await prisma.lead.create({
    data: {
      companyId: prestige.id,
      name: 'Vikram Malhotra',
      phone: '+919827953551',
      email: 'vikram.m@rediffmail.com',
      city: 'Bangalore',
      temperature: 'HOT',
      stage: 'APPOINTMENT_BOOKED',
      budget: '1.8 - 2.0 Cr',
      timeline: 'Within 60 Days',
      need: 'Looking for 3BHK duplex villa with east-facing garden for family of 4.',
      authority: 'Decision maker with self-funded capital',
      summary: 'Spoke for 4 mins on Voice AI. Loved the Garden Villa pricing. Booked Saturday morning site visit with complimentary cab pickup.',
      recordingUrl: 'https://cdn.talkar.in/recordings/demo-prestige-vikram.mp3',
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

  const leadPrestige2 = await prisma.lead.create({
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

  // 2. HEALTHCARE CLINIC: Clove Dental
  const clove = await prisma.company.upsert({
    where: { slug: 'clove-dental' },
    update: {},
    create: {
      slug: 'clove-dental',
      name: 'Clove Dental Super Speciality Clinics',
      brand: 'Clove Dental',
      industry: 'HEALTHCARE_CLINIC',
      tagline: 'India’s Largest & Most Trusted Dental Clinic Network',
      description: 'Painless dental implants, clear invisible aligners, laser root canal, and cosmetic dentistry.',
      phone: '+911140003000',
      email: 'appointments@clovedental.in',
      website: 'https://clovedental.in',
      address: 'Plot 14, Commercial Complex, Sector 29',
      city: 'Gurugram',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      offeringNoun: 'Dental Treatment & Procedure',
      appointmentNoun: 'Doctor OPD Consultation',
      offerings: {
        create: [
          {
            code: 'CLOVE-IMPLANT',
            title: 'German Titanium Single Dental Implant',
            category: 'Implantology',
            description: 'Grade 5 Bio-compatible titanium screw with custom zirconia crown and 10-year global warranty.',
            price: 28000,
            currency: 'INR',
            specs: JSON.stringify({ warranty: '10 Years Global', material: 'German Titanium', sitting: '2 Sittings' }),
            photos: JSON.stringify(['https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1200&q=80']),
            brochureUrl: 'https://clovedental.in/patient-guide/dental-implants.pdf',
          },
          {
            code: 'CLOVE-INVISALIGN',
            title: 'Clear Invisible Aligners (Complete Orthodontic Correction)',
            category: 'Orthodontics',
            description: 'Custom 3D-scanned invisible aligner trays. Zero metal brackets, removable for dining.',
            price: 65000,
            currency: 'INR',
            specs: JSON.stringify({ duration: '6-9 Months', tech: '3D AI Digital Scan', includesWhitening: true }),
            photos: JSON.stringify(['https://images.unsplash.com/photo-1606811841689-23dfddce3e95?auto=format&fit=crop&w=1200&q=80']),
            brochureUrl: 'https://clovedental.in/patient-guide/invisible-aligners.pdf',
          },
          {
            code: 'CLOVE-ROOTCANAL',
            title: 'Laser Rotary Root Canal Therapy & Zirconia Crown',
            category: 'Endodontics',
            description: 'Computer-guided painless single-sitting root canal with apex locator and porcelain cap.',
            price: 9500,
            currency: 'INR',
            specs: JSON.stringify({ duration: '45 Minutes', painless: true, crownIncluded: true }),
            photos: JSON.stringify(['https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=1200&q=80']),
            brochureUrl: 'https://clovedental.in/patient-guide/root-canal-treatment.pdf',
          },
        ],
      },
    },
  });

  const leadClove1 = await prisma.lead.create({
    data: {
      companyId: clove.id,
      name: 'Dr. Neha Sharma',
      phone: '+919811223344',
      email: 'neha.sharma@apollo.org',
      city: 'Gurugram',
      temperature: 'HOT',
      stage: 'APPOINTMENT_BOOKED',
      budget: '30,000 INR',
      timeline: 'Immediate (Severe toothache)',
      need: 'Lower right molar replacement with single dental implant.',
      summary: 'Patient experiencing discomfort in lower molar. AI agent assured 10-year warranty and scheduled urgent OPD consultation for Saturday 3:00 PM.',
      recordingUrl: 'https://cdn.talkar.in/recordings/demo-clove-neha.mp3',
      callRunId: 'WR-89105',
      appointments: {
        create: {
          companyId: clove.id,
          reference: 'OPD-3184',
          type: 'Doctor OPD Consultation',
          date: '2026-11-28',
          timeSlot: '03:00 PM',
          status: 'SCHEDULED',
          notes: 'Chief complaint: Lower molar extraction and immediate titanium implant consultation.',
        },
      },
    },
  });

  // 3. B2B SAAS: GuruG Plus
  const gurug = await prisma.company.upsert({
    where: { slug: 'gurug-saas' },
    update: {},
    create: {
      slug: 'gurug-saas',
      name: 'GuruG Plus - School Management ERP',
      brand: 'Inventive Infotech',
      industry: 'B2B_SAAS',
      tagline: 'Complete Cloud ERP & Mobile App for Modern K-12 Schools',
      description: 'Automated fee collection, parent communication app, report card generation, and student biometric tracking.',
      phone: '+919810112233',
      email: 'demo@inventiveinfotech.com',
      website: 'https://inventiveinfotech.com',
      address: 'Tower B, Cyber City',
      city: 'Gurugram',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      offeringNoun: 'SaaS Subscription Tier',
      appointmentNoun: '15-Min Live Screen Demo',
      offerings: {
        create: [
          {
            code: 'GURUG-STARTER',
            title: 'GuruG Starter Edition (Up to 500 Students)',
            category: 'SaaS Annual Plan',
            description: 'Core Student Information System, automated SMS attendance alerts, and fee ledger management.',
            price: 35000,
            currency: 'INR',
            specs: JSON.stringify({ studentCapacity: 500, smsIncluded: '10,000/yr', mobileApp: 'Web Responsive' }),
            photos: JSON.stringify(['https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=80']),
            brochureUrl: 'https://inventiveinfotech.com/docs/gurug-starter-spec.pdf',
          },
          {
            code: 'GURUG-ENTERPRISE',
            title: 'GuruG Complete K-12 Enterprise ERP',
            category: 'SaaS Annual Plan',
            description: 'Full K-12 suite: Payment Gateway auto-reconciliation, Examination & CBSE Report Cards, Native iOS/Android Apps.',
            price: 85000,
            currency: 'INR',
            specs: JSON.stringify({ studentCapacity: 'Unlimited', nativeApps: true, cbseReports: true, dedicatedManager: true }),
            photos: JSON.stringify(['https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1200&q=80']),
            brochureUrl: 'https://inventiveinfotech.com/docs/gurug-enterprise-brochure.pdf',
          },
          {
            code: 'GURUG-MULTI-CAMPUS',
            title: 'GuruG Multi-Campus Trust Edition',
            category: 'Multi-School Group',
            description: 'Centralized multi-school oversight, unified financial rollups, and franchise branch management.',
            price: 195000,
            currency: 'INR',
            specs: JSON.stringify({ maxSchools: 10, consolidatedAudits: true, customDomain: true }),
            photos: JSON.stringify(['https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=1200&q=80']),
            brochureUrl: 'https://inventiveinfotech.com/docs/gurug-trust-network.pdf',
          },
        ],
      },
    },
  });

  const leadGurug1 = await prisma.lead.create({
    data: {
      companyId: gurug.id,
      name: 'Principal Anand Verma',
      phone: '+919871199887',
      email: 'principal@stjosephconvent.edu.in',
      city: 'Delhi NCR',
      temperature: 'HOT',
      stage: 'APPOINTMENT_BOOKED',
      budget: '80,000 - 1,00,000 INR',
      timeline: 'Upcoming Academic Session (April)',
      need: 'Replacing legacy desktop fee software with cloud-based ERP and parent mobile app for 1,400 students.',
      authority: 'School Principal & Trustee',
      summary: 'Spoke with Talkar Voice AI. Highly receptive to automated fee reminders. Booked 15-min screen demo for tomorrow 11:00 AM.',
      recordingUrl: 'https://cdn.talkar.in/recordings/demo-gurug-anand.mp3',
      callRunId: 'WR-89109',
      appointments: {
        create: {
          companyId: gurug.id,
          reference: 'DEMO-9102',
          type: '15-Min Live Screen Demo',
          date: '2026-11-24',
          timeSlot: '11:00 AM',
          status: 'SCHEDULED',
          notes: 'Google Meet link to be emailed. Focus on CBSE report card generation module.',
        },
      },
    },
  });

  console.log(`✅ Seed completed successfully!`);
  console.log(`🏢 Seeded Companies:`);
  console.log(`   1. ${prestige.name} (${prestige.slug}) - ${prestige.industry}`);
  console.log(`   2. ${clove.name} (${clove.slug}) - ${clove.industry}`);
  console.log(`   3. ${gurug.name} (${gurug.slug}) - ${gurug.industry}`);
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
