import { prisma } from '../lib/prisma.js';
import { eventService } from './events.js';
import { generateReference, sanitizePhone } from './reference.js';

export interface CheckOfferingsOptions {
  category?: string;
  budgetMax?: number;
  query?: string;
}

export interface BookAppointmentInput {
  leadName: string;
  leadPhone: string;
  leadEmail?: string;
  appointmentType?: string;
  slotDate: string; // YYYY-MM-DD
  slotTime: string; // e.g. "11:30 AM"
  notes?: string;
  source?: string;
  callRunId?: string;
}

export interface ScheduleCallbackInput {
  leadPhone: string;
  leadName?: string;
  callbackTime: string; // ISO or date string
  reason?: string;
}

function parseFlexibleCallbackDate(timeStr?: string): Date | null {
  if (!timeStr) return null;
  const str = timeStr.trim().toLowerCase();
  const d = new Date(timeStr);
  if (!isNaN(d.getTime())) return d;

  const now = new Date();
  const baseDate = new Date(now);

  if (str.includes('tomorrow')) {
    baseDate.setDate(now.getDate() + 1);
  } else if (str.includes('day after')) {
    baseDate.setDate(now.getDate() + 2);
  } else {
    return null;
  }

  const timeMatch = str.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1], 10);
    const mins = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const meridian = timeMatch[3].toLowerCase();
    if (meridian === 'pm' && hours < 12) hours += 12;
    if (meridian === 'am' && hours === 12) hours = 0;
    baseDate.setHours(hours, mins, 0, 0);
  }
  return baseDate;
}

export class SalesService {
  /**
   * Find company by slug
   */
  async getCompanyBySlug(slug: string) {
    return prisma.company.findUnique({
      where: { slug },
      include: {
        _count: {
          select: {
            offerings: true,
            leads: true,
            appointments: true,
          },
        },
      },
    });
  }

  /**
   * Query catalog offerings with optional budget or category filters
   */
  async getOfferings(companySlug: string, options: CheckOfferingsOptions = {}) {
    const company = await prisma.company.findUnique({
      where: { slug: companySlug },
      include: {
        offerings: {
          where: { isActive: true },
          orderBy: { price: 'asc' },
        },
      },
    });

    if (!company) {
      throw new Error(`Company with slug "${companySlug}" not found`);
    }

    let items = company.offerings;

    if (options.category) {
      const cat = options.category.toLowerCase();
      items = items.filter(
        (o) =>
          o.category.toLowerCase().includes(cat) ||
          o.title.toLowerCase().includes(cat) ||
          o.code.toLowerCase().includes(cat)
      );
    }

    if (options.budgetMax && options.budgetMax > 0) {
      items = items.filter((o) => o.price <= options.budgetMax!);
    }

    if (options.query) {
      const q = options.query.toLowerCase();
      items = items.filter(
        (o) =>
          o.title.toLowerCase().includes(q) ||
          (o.description && o.description.toLowerCase().includes(q)) ||
          o.category.toLowerCase().includes(q)
      );
    }

    // Voice agent recommendation hint
    const recommendation =
      items.length > 0
        ? `Found ${items.length} matched ${company.offeringNoun.toLowerCase()}(s). Best match: ${items[0].title} priced at ${company.currency} ${items[0].price.toLocaleString('en-IN')}.`
        : `No ${company.offeringNoun.toLowerCase()} found matching the criteria.`;

    return {
      company: {
        name: company.name,
        slug: company.slug,
        industry: company.industry,
        currency: company.currency,
        offeringNoun: company.offeringNoun,
        appointmentNoun: company.appointmentNoun,
      },
      count: items.length,
      recommendationPrompt: recommendation,
      items: items.map((i) => ({
        id: i.id,
        code: i.code,
        title: i.title,
        category: i.category,
        description: i.description,
        price: i.price,
        formattedPrice: `${company.currency} ${i.price.toLocaleString('en-IN')}`,
        specs: i.specs ? JSON.parse(i.specs) : null,
        photos: i.photos ? JSON.parse(i.photos) : [],
        brochureUrl: i.brochureUrl,
      })),
    };
  }

  /**
   * Book appointment / site visit / demo
   */
  async bookAppointment(companySlug: string, input: BookAppointmentInput) {
    const company = await prisma.company.findUnique({
      where: { slug: companySlug },
    });

    if (!company) {
      throw new Error(`Company with slug "${companySlug}" not found`);
    }

    const cleanPhone = sanitizePhone(input.leadPhone);
    const appointmentType = input.appointmentType || company.appointmentNoun;

    // Prefix for reference based on industry
    let prefix = 'BOOK';
    if (company.industry === 'REAL_ESTATE') prefix = 'VISIT';
    else if (company.industry === 'B2B_SAAS') prefix = 'DEMO';
    else if (company.industry === 'HEALTHCARE_CLINIC') prefix = 'OPD';
    else if (company.industry === 'AUTOMOBILE') prefix = 'DRIVE';

    const reference = generateReference(prefix);

    // Find or create lead
    const existingLeads = await prisma.lead.findMany({
      where: {
        companyId: company.id,
        phone: cleanPhone,
      },
      orderBy: { updatedAt: 'desc' },
    });

    let lead = existingLeads[0];

    // Clean up empty duplicate leads with the same phone if they have no appointments
    if (existingLeads.length > 1) {
      for (let i = 1; i < existingLeads.length; i++) {
        const dup = existingLeads[i];
        const aptCount = await prisma.appointment.count({ where: { leadId: dup.id } });
        if (aptCount === 0) {
          await prisma.lead.delete({ where: { id: dup.id } }).catch(() => {});
        }
      }
    }

    if (lead) {
      lead = await prisma.lead.update({
        where: { id: lead.id },
        data: {
          name: input.leadName || lead.name,
          email: input.leadEmail || lead.email,
          temperature: 'HOT',
          stage: 'APPOINTMENT_BOOKED',
          notes: input.notes
            ? `${lead.notes ? lead.notes + '\n' : ''}[${new Date().toLocaleDateString()}] ${input.notes}`
            : lead.notes,
        },
      });
    } else {
      lead = await prisma.lead.create({
        data: {
          companyId: company.id,
          name: input.leadName || 'Valued Prospect',
          phone: cleanPhone,
          email: input.leadEmail,
          temperature: 'HOT',
          stage: 'APPOINTMENT_BOOKED',
          source: input.source || 'VOICE_AI',
          callRunId: input.callRunId,
          notes: input.notes,
        },
      });
    }

    // Create appointment
    const appointment = await prisma.appointment.create({
      data: {
        companyId: company.id,
        leadId: lead.id,
        reference,
        type: appointmentType,
        date: input.slotDate,
        timeSlot: input.slotTime,
        status: 'SCHEDULED',
        notes: input.notes,
        source: input.source || 'VOICE_AI',
        callRunId: input.callRunId,
      },
    });

    // Broadcast SSE live event
    eventService.broadcast(
      'lead_updated',
      {
        companySlug: company.slug,
        leadId: lead.id,
        leadName: lead.name,
        leadPhone: lead.phone,
        temperature: lead.temperature,
        stage: lead.stage,
        appointment: {
          reference: appointment.reference,
          type: appointment.type,
          date: appointment.date,
          timeSlot: appointment.timeSlot,
        },
      },
      company.slug
    );

    const voiceScript = `Your ${appointmentType} is scheduled for ${appointment.date} at ${appointment.timeSlot}. Your booking reference code is ${reference.split('').join(' ')}.`;

    return {
      success: true,
      bookingRef: appointment.reference,
      status: appointment.status,
      appointmentType: appointment.type,
      date: appointment.date,
      timeSlot: appointment.timeSlot,
      voiceConfirmationScript: voiceScript,
      lead: {
        id: lead.id,
        name: lead.name,
        phone: lead.phone,
        temperature: lead.temperature,
        stage: lead.stage,
      },
    };
  }

  /**
   * Schedule callback for prospect
   */
  async scheduleCallback(companySlug: string, input: ScheduleCallbackInput) {
    const company = await prisma.company.findUnique({
      where: { slug: companySlug },
    });

    if (!company) {
      throw new Error(`Company with slug "${companySlug}" not found`);
    }

    const cleanPhone = sanitizePhone(input.leadPhone);
    const callbackDate = parseFlexibleCallbackDate(input.callbackTime);

    let lead = await prisma.lead.findFirst({
      where: {
        companyId: company.id,
        phone: cleanPhone,
      },
    });

    if (lead) {
      lead = await prisma.lead.update({
        where: { id: lead.id },
        data: {
          name: input.leadName || lead.name,
          temperature: 'WARM',
          stage: 'QUALIFIED',
          callbackAt: callbackDate,
          callbackReason: input.reason || 'Requested callback during call',
        },
      });
    } else {
      lead = await prisma.lead.create({
        data: {
          companyId: company.id,
          name: input.leadName || 'Callback Prospect',
          phone: cleanPhone,
          temperature: 'WARM',
          stage: 'QUALIFIED',
          callbackAt: callbackDate,
          callbackReason: input.reason || 'Requested callback during call',
        },
      });
    }

    eventService.broadcast(
      'lead_updated',
      {
        companySlug: company.slug,
        leadId: lead.id,
        leadName: lead.name,
        leadPhone: lead.phone,
        temperature: lead.temperature,
        stage: lead.stage,
        callbackAt: lead.callbackAt,
        callbackReason: lead.callbackReason,
      },
      company.slug
    );

    return {
      success: true,
      message: `Callback scheduled for ${lead.phone} at ${input.callbackTime}`,
      lead: {
        id: lead.id,
        name: lead.name,
        phone: lead.phone,
        callbackAt: lead.callbackAt,
        stage: lead.stage,
      },
    };
  }

  /**
   * Lookup lead by phone or reference
   */
  async lookupLead(companySlug: string, query: string) {
    const company = await prisma.company.findUnique({
      where: { slug: companySlug },
    });

    if (!company) {
      throw new Error(`Company with slug "${companySlug}" not found`);
    }

    const cleanQuery = query.trim();
    const cleanPhone = sanitizePhone(cleanQuery);

    const lead = await prisma.lead.findFirst({
      where: {
        companyId: company.id,
        OR: [
          { phone: cleanPhone },
          { phone: cleanQuery },
          { name: { contains: cleanQuery } },
          { appointments: { some: { reference: cleanQuery.toUpperCase() } } },
        ],
      },
      include: {
        appointments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!lead) {
      return { found: false, message: `No lead or booking found matching "${query}".` };
    }

    return {
      found: true,
      lead: {
        id: lead.id,
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        temperature: lead.temperature,
        stage: lead.stage,
        budget: lead.budget,
        timeline: lead.timeline,
        summary: lead.summary,
        recordingUrl: lead.recordingUrl,
        callbackAt: lead.callbackAt,
        callbackReason: lead.callbackReason,
        appointments: lead.appointments,
      },
    };
  }

  /**
   * Process post-call webhook from Talkar Voice AI
   */
  async processCallWebhook(body: any) {
    const extracted = body.extracted_data || body.extracted_variables || {};
    const companySlug =
      body.company_slug ||
      body.initial_context?.company_slug ||
      extracted.company_slug ||
      'prestige-group';

    const company = await prisma.company.findUnique({
      where: { slug: companySlug },
    });

    if (!company) {
      throw new Error(`Company "${companySlug}" not found for webhook`);
    }

    const rawPhone = body.caller_number || body.called_number || extracted.lead_phone || body.phone;
    const cleanPhone = sanitizePhone(rawPhone);
    const leadName = extracted.lead_name || extracted.name || 'Voice Prospect';

    let temperature = 'WARM';
    if (extracted.lead_temperature) {
      temperature = String(extracted.lead_temperature).toUpperCase();
    } else if (extracted.appointment_booked || extracted.booked) {
      temperature = 'HOT';
    } else if (extracted.not_interested) {
      temperature = 'COLD';
    }

    let stage = 'QUALIFIED';
    if (extracted.appointment_booked) stage = 'APPOINTMENT_BOOKED';
    else if (temperature === 'COLD') stage = 'LOST';

    let lead = await prisma.lead.findFirst({
      where: { companyId: company.id, phone: cleanPhone },
    });

    const updateData = {
      name: leadName,
      temperature,
      stage,
      budget: extracted.budget_range || extracted.budget || undefined,
      timeline: extracted.timeline || undefined,
      need: extracted.need || extracted.interested_category || undefined,
      summary: extracted.summary || body.summary,
      recordingUrl: body.recording_url,
      callRunId: String(body.workflow_run_id || body.run_id || ''),
    };

    if (lead) {
      lead = await prisma.lead.update({
        where: { id: lead.id },
        data: updateData,
      });
    } else {
      lead = await prisma.lead.create({
        data: {
          companyId: company.id,
          phone: cleanPhone,
          ...updateData,
        },
      });
    }

    // Auto-create appointment if booked on call
    let appointment = null;
    if (extracted.appointment_booked && extracted.appointment_date) {
      let prefix = 'BOOK';
      if (company.industry === 'REAL_ESTATE') prefix = 'VISIT';
      else if (company.industry === 'B2B_SAAS') prefix = 'DEMO';
      else if (company.industry === 'HEALTHCARE_CLINIC') prefix = 'OPD';

      appointment = await prisma.appointment.create({
        data: {
          companyId: company.id,
          leadId: lead.id,
          reference: generateReference(prefix),
          type: extracted.appointment_type || company.appointmentNoun,
          date: String(extracted.appointment_date),
          timeSlot: String(extracted.appointment_time || '11:00 AM'),
          status: 'SCHEDULED',
          notes: extracted.notes || 'Booked via Talkar Voice AI call',
          source: 'VOICE_AI',
          callRunId: String(body.workflow_run_id || ''),
        },
      });
    }

    // Live broadcast to Kanban
    eventService.broadcast(
      'call_completed',
      {
        companySlug: company.slug,
        leadId: lead.id,
        leadName: lead.name,
        leadPhone: lead.phone,
        temperature: lead.temperature,
        stage: lead.stage,
        summary: lead.summary,
        recordingUrl: lead.recordingUrl,
        appointment,
      },
      company.slug
    );

    return {
      success: true,
      leadId: lead.id,
      leadName: lead.name,
      stage: lead.stage,
      temperature: lead.temperature,
      appointment,
    };
  }

  /**
   * Trigger an outbound AI voice call to a lead via Talkar MCP / API
   */
  async triggerAiCall(companySlug: string, leadId: string) {
    const company = await prisma.company.findUnique({
      where: { slug: companySlug },
    });
    if (!company) {
      throw new Error(`Company with slug "${companySlug}" not found`);
    }

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
    });
    if (!lead) {
      throw new Error(`Lead "${leadId}" not found`);
    }

    const cleanPhone = sanitizePhone(lead.phone);
    const apiKey = process.env.TALKAR_API_KEY || 'dgr_mhbjuBQqjlZS1AWJ12_SjWd9d_YmmOvGYJtSwQ_UCtY';
    const workflowId = 125; // Default for Prestige Luxury Estates
    const fromPhoneNumberId = 14; // Default outbound DID (+918031453020)

    const payload = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: 'initiate_call',
        arguments: {
          workflow_id: workflowId,
          phone_number: cleanPhone,
          from_phone_number_id: fromPhoneNumberId,
          initial_context: {
            customer_name: lead.name,
            name: lead.name,
            budget: lead.budget || '',
            need: lead.need || lead.notes || '',
            callback_reason: lead.callbackReason || '',
            is_followup: Boolean(lead.callbackAt || lead.callbackReason),
          },
        },
      },
    };

    const resp = await fetch('https://talkar.in/api/v1/mcp/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify(payload),
    });

    const rawText = await resp.text();
    let callResult: any = null;
    const lines = rawText.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const parsed = JSON.parse(line.slice(6));
          if (parsed.result && parsed.result.content && parsed.result.content[0]) {
            callResult = JSON.parse(parsed.result.content[0].text);
          } else if (parsed.error) {
            throw new Error(parsed.error.message || JSON.stringify(parsed.error));
          }
        } catch (e: any) {
          if (!callResult) callResult = { raw: line };
        }
      }
    }

    if (!callResult) {
      try {
        const directJson = JSON.parse(rawText);
        if (directJson.result?.content?.[0]?.text) {
          callResult = JSON.parse(directJson.result.content[0].text);
        } else {
          callResult = directJson;
        }
      } catch (e) {
        callResult = { raw: rawText };
      }
    }

    eventService.broadcast(
      'ai_call_dispatched',
      {
        companySlug,
        leadId: lead.id,
        leadName: lead.name,
        phone: cleanPhone,
        callResult,
      },
      companySlug
    );

    return {
      success: true,
      message: `Outbound AI call dispatched to ${lead.name}`,
      lead,
      callResult,
    };
  }
}

export const salesService = new SalesService();
