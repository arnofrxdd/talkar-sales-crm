import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { salesService } from '../services/sales.js';

export const offeringsRouter = Router({ mergeParams: true });

// GET /api/companies/:slug/offerings - Check offerings / catalog
offeringsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const { category, budget_max, query } = req.query;

    const result = await salesService.getOfferings(slug, {
      category: category ? String(category) : undefined,
      budgetMax: budget_max ? Number(budget_max) : undefined,
      query: query ? String(query) : undefined,
    });

    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/companies/:slug/offerings - Add new offering
offeringsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const { code, title, category, description, price, specs, brochureUrl, photos } = req.body;

    const company = await prisma.company.findUnique({ where: { slug } });
    if (!company) {
      return res.status(404).json({ success: false, error: `Company "${slug}" not found` });
    }

    if (!title || price === undefined) {
      return res.status(400).json({ success: false, error: 'Title and price are required' });
    }

    const offeringCode = code || `${slug.toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    const offering = await prisma.offering.create({
      data: {
        companyId: company.id,
        code: offeringCode,
        title,
        category: category || 'Standard',
        description,
        price: Number(price),
        specs: specs ? (typeof specs === 'string' ? specs : JSON.stringify(specs)) : null,
        photos: photos ? (typeof photos === 'string' ? photos : JSON.stringify(photos)) : '[]',
        brochureUrl,
      },
    });

    res.status(201).json({ success: true, offering });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});
