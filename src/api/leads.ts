import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { salesService } from '../services/sales.js';
import { eventService } from '../services/events.js';
import { sanitizePhone } from '../services/reference.js';

export const leadsRouter = Router({ mergeParams: true });

// GET /api/companies/:slug/leads - List leads with filters
leadsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const { temperature, stage, search } = req.query;

    const company = await prisma.company.findUnique({ where: { slug } });
    if (!company) {
      return res.status(404).json({ success: false, error: `Company "${slug}" not found` });
    }

    const whereClause: any = { companyId: company.id };
    if (temperature) whereClause.temperature = String(temperature).toUpperCase();
    if (stage) whereClause.stage = String(stage).toUpperCase();
    if (search) {
      const q = String(search).trim();
      whereClause.OR = [
        { name: { contains: q } },
        { phone: { contains: q } },
        { email: { contains: q } },
      ];
    }

    const leads = await prisma.lead.findMany({
      where: whereClause,
      include: {
        appointments: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Calculate BANT & Pipeline stats
    const stats = {
      total: leads.length,
      hot: leads.filter((l) => l.temperature === 'HOT').length,
      warm: leads.filter((l) => l.temperature === 'WARM').length,
      cold: leads.filter((l) => l.temperature === 'COLD').length,
      appointmentBooked: leads.filter((l) => l.stage === 'APPOINTMENT_BOOKED').length,
    };

    res.json({ success: true, stats, count: leads.length, leads });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/companies/:slug/leads/lookup - Voice AI lead lookup
leadsRouter.get('/lookup', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({ success: false, error: 'Query parameter is required' });
    }

    const result = await salesService.lookupLead(slug, String(query));
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/companies/:slug/leads - Create or update lead manually
leadsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const { name, phone, email, city, temperature, stage, budget, timeline, need, notes } = req.body;

    const company = await prisma.company.findUnique({ where: { slug } });
    if (!company) {
      return res.status(404).json({ success: false, error: `Company "${slug}" not found` });
    }

    if (!phone) {
      return res.status(400).json({ success: false, error: 'Phone number is required' });
    }

    const cleanPhone = sanitizePhone(phone);

    // Look for existing lead with same ID or same phone
    let existingLead = null;
    if (req.body.id) {
      existingLead = await prisma.lead.findUnique({ where: { id: req.body.id } });
    }
    if (!existingLead && cleanPhone) {
      existingLead = await prisma.lead.findFirst({
        where: { companyId: company.id, phone: cleanPhone },
      });
    }

    let lead;
    if (existingLead) {
      lead = await prisma.lead.update({
        where: { id: existingLead.id },
        data: {
          name: name || undefined,
          email: email || undefined,
          city: city || undefined,
          temperature: temperature ? String(temperature).toUpperCase() : undefined,
          stage: stage ? String(stage).toUpperCase() : undefined,
          budget: budget || undefined,
          timeline: timeline || undefined,
          need: need || undefined,
          notes: notes || undefined,
        },
      });
    } else {
      lead = await prisma.lead.create({
        data: {
          companyId: company.id,
          name: name || 'Direct Prospect',
          phone: cleanPhone,
          email,
          city,
          temperature: temperature ? String(temperature).toUpperCase() : 'WARM',
          stage: stage ? String(stage).toUpperCase() : 'NEW',
          budget,
          timeline,
          need,
          notes,
          source: 'MANUAL',
        },
      });
    }

    eventService.broadcast('lead_updated', { companySlug: slug, lead }, slug);

    res.status(201).json({ success: true, lead });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// DELETE /api/companies/:slug/leads/:id - Delete lead
leadsRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { slug, id } = req.params;
    await prisma.lead.delete({
      where: { id },
    });

    eventService.broadcast('lead_deleted', { companySlug: slug, leadId: id }, slug);

    res.json({ success: true, message: 'Lead deleted' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// PATCH /api/companies/:slug/leads/:id/stage - Update lead stage / temperature (for Kanban drag & drop)
leadsRouter.patch('/:id/stage', async (req: Request, res: Response) => {
  try {
    const { slug, id } = req.params;
    const { stage, temperature } = req.body;

    const lead = await prisma.lead.update({
      where: { id },
      data: {
        stage: stage ? String(stage).toUpperCase() : undefined,
        temperature: temperature ? String(temperature).toUpperCase() : undefined,
      },
    });

    eventService.broadcast('lead_stage_changed', { companySlug: slug, leadId: lead.id, stage: lead.stage, temperature: lead.temperature }, slug);

    res.json({ success: true, lead });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/companies/:slug/leads/:id/ai-call - Trigger Talkar Voice AI call to lead
leadsRouter.post('/:id/ai-call', async (req: Request, res: Response) => {
  try {
    const { slug, id } = req.params;
    const result = await salesService.triggerAiCall(slug, id);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
