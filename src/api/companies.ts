import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

export const companiesRouter = Router();

// GET /api/companies - List all companies
companiesRouter.get('/', async (req: Request, res: Response) => {
  try {
    const companies = await prisma.company.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: {
            offerings: true,
            leads: true,
            appointments: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ success: true, count: companies.length, companies });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/companies/:slug - Get single company profile
companiesRouter.get('/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const company = await prisma.company.findUnique({
      where: { slug },
      include: {
        offerings: { where: { isActive: true } },
        _count: {
          select: { leads: true, appointments: true },
        },
      },
    });

    if (!company) {
      return res.status(404).json({ success: false, error: `Company "${slug}" not found` });
    }

    res.json({ success: true, company });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/companies - Register a new company (5-Minute Onboarding)
companiesRouter.post('/', async (req: Request, res: Response) => {
  try {
    const {
      name,
      slug,
      industry,
      brand,
      tagline,
      description,
      phone,
      email,
      website,
      city,
      currency,
      offeringNoun,
      appointmentNoun,
      initialOfferings,
    } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ success: false, error: 'Name and slug are required' });
    }

    // Generate industry nouns if omitted
    let defaultOfferingNoun = offeringNoun || 'Product / Plan';
    let defaultAppointmentNoun = appointmentNoun || 'Appointment / Demo';

    if (industry === 'REAL_ESTATE') {
      defaultOfferingNoun = offeringNoun || 'Villa & Apartment Configuration';
      defaultAppointmentNoun = appointmentNoun || 'Site Visit & Cab Pickup';
    } else if (industry === 'HEALTHCARE_CLINIC') {
      defaultOfferingNoun = offeringNoun || 'Treatment & Procedure';
      defaultAppointmentNoun = appointmentNoun || 'Doctor OPD Consultation';
    } else if (industry === 'B2B_SAAS') {
      defaultOfferingNoun = offeringNoun || 'SaaS Subscription Tier';
      defaultAppointmentNoun = appointmentNoun || '15-Min Live Screen Demo';
    } else if (industry === 'AUTOMOBILE') {
      defaultOfferingNoun = offeringNoun || 'Vehicle Model & Trim';
      defaultAppointmentNoun = appointmentNoun || 'Home Test Drive';
    }

    const company = await prisma.company.create({
      data: {
        name,
        slug: slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-'),
        industry: industry || 'GENERIC_SALES',
        brand,
        tagline,
        description,
        phone,
        email,
        website,
        city: city || 'National',
        currency: currency || 'INR',
        offeringNoun: defaultOfferingNoun,
        appointmentNoun: defaultAppointmentNoun,
      },
    });

    // Optionally create initial offerings
    if (Array.isArray(initialOfferings) && initialOfferings.length > 0) {
      for (const off of initialOfferings) {
        await prisma.offering.create({
          data: {
            companyId: company.id,
            code: off.code || `${company.slug.toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
            title: off.title,
            category: off.category || 'General',
            price: Number(off.price) || 0,
            description: off.description,
            specs: off.specs ? JSON.stringify(off.specs) : null,
            brochureUrl: off.brochureUrl,
          },
        });
      }
    }

    res.status(201).json({ success: true, company });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});
