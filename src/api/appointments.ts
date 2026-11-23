import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { salesService } from '../services/sales.js';

export const appointmentsRouter = Router({ mergeParams: true });

// GET /api/companies/:slug/appointments - List appointments
appointmentsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const { date, status } = req.query;

    const company = await prisma.company.findUnique({ where: { slug } });
    if (!company) {
      return res.status(404).json({ success: false, error: `Company "${slug}" not found` });
    }

    const whereClause: any = { companyId: company.id };
    if (date) whereClause.date = String(date);
    if (status) whereClause.status = String(status).toUpperCase();

    const appointments = await prisma.appointment.findMany({
      where: whereClause,
      include: {
        lead: true,
      },
      orderBy: [{ date: 'asc' }, { timeSlot: 'asc' }],
    });

    res.json({ success: true, count: appointments.length, appointments });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/companies/:slug/appointments - Book appointment via REST API / Voice Tool
appointmentsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const {
      lead_name,
      lead_phone,
      lead_email,
      appointment_type,
      slot_date,
      slot_time,
      date,
      time_slot,
      type,
      notes,
      source,
      call_run_id,
    } = req.body;

    const finalDate = slot_date || date;
    const finalTime = slot_time || time_slot;
    const finalType = appointment_type || type;

    if (!lead_phone || !finalDate || !finalTime) {
      return res.status(400).json({
        success: false,
        error: 'lead_phone, slot_date/date, and slot_time/time_slot are required',
      });
    }

    const result = await salesService.bookAppointment(slug, {
      leadName: lead_name,
      leadPhone: lead_phone,
      leadEmail: lead_email,
      appointmentType: finalType,
      slotDate: finalDate,
      slotTime: finalTime,
      notes,
      source,
      callRunId: call_run_id,
    });

    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/companies/:slug/callbacks - Schedule callback
appointmentsRouter.post('/callbacks', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const { lead_phone, lead_name, callback_time, reason } = req.body;

    if (!lead_phone || !callback_time) {
      return res.status(400).json({
        success: false,
        error: 'lead_phone and callback_time are required',
      });
    }

    const result = await salesService.scheduleCallback(slug, {
      leadPhone: lead_phone,
      leadName: lead_name,
      callbackTime: callback_time,
      reason,
    });

    res.status(200).json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});
