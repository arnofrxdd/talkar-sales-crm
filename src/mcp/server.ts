import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { prisma } from '../lib/prisma.js';
import { salesService } from '../services/sales.js';

export function createMcpServer(): Server {
  const server = new Server(
    {
      name: 'talkar-sales-crm',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Define available MCP tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'sales_crm_list_companies',
          description:
            'List all active companies in the Sales CRM with their industry type, terminology nouns, and active lead stats.',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'sales_crm_add_company',
          description:
            'Onboard a new client company into the Sales CRM with industry type, custom terminology, and initial product catalog.',
          inputSchema: {
            type: 'object',
            required: ['name', 'slug', 'industry'],
            properties: {
              name: { type: 'string', description: 'Full company name (e.g. DLF CyberCity, Apollo Dental)' },
              slug: { type: 'string', description: 'Unique slug (e.g. dlf-homes, apollo-dental)' },
              industry: {
                type: 'string',
                description:
                  'Industry type: REAL_ESTATE, HEALTHCARE_CLINIC, B2B_SAAS, AUTOMOBILE, EDUCATION_COACHING, LEGAL_FINANCE, GENERIC_SALES',
              },
              offering_noun: { type: 'string', description: 'Custom noun for products (e.g. "Villa", "Treatment", "SaaS Tier")' },
              appointment_noun: { type: 'string', description: 'Custom noun for appointments (e.g. "Site Visit", "OPD Consultation", "Live Demo")' },
              currency: { type: 'string', description: 'Currency code (INR, USD, EUR, GBP)' },
              phone: { type: 'string', description: 'Company main contact number' },
              city: { type: 'string', description: 'Headquarters or primary market city' },
              initial_offerings: {
                type: 'array',
                description: 'Initial catalog items to seed',
                items: {
                  type: 'object',
                  required: ['title', 'price'],
                  properties: {
                    title: { type: 'string' },
                    price: { type: 'number' },
                    category: { type: 'string' },
                    description: { type: 'string' },
                    brochure_url: { type: 'string' },
                  },
                },
              },
            },
          },
        },
        {
          name: 'sales_crm_check_offerings',
          description:
            'Query catalog offerings/products/plans/units for a company with optional budget or category filters. Returns prices, specs, and brochure URLs.',
          inputSchema: {
            type: 'object',
            required: ['company_slug'],
            properties: {
              company_slug: { type: 'string', description: 'Company unique slug (e.g. prestige-group, clove-dental, gurug-saas)' },
              category: { type: 'string', description: 'Category filter (e.g. "3bhk", "implant", "enterprise")' },
              budget_max: { type: 'number', description: 'Maximum budget threshold in local currency' },
              query: { type: 'string', description: 'Keyword search in title or description' },
            },
          },
        },
        {
          name: 'sales_crm_book_appointment',
          description:
            'Book an appointment (site visit, demo, consultation, or test drive) for a prospect. Marks lead as HOT and returns reference code with voice script.',
          inputSchema: {
            type: 'object',
            required: ['company_slug', 'lead_name', 'lead_phone', 'slot_date', 'slot_time'],
            properties: {
              company_slug: { type: 'string', description: 'Company slug' },
              lead_name: { type: 'string', description: 'Prospect full name' },
              lead_phone: { type: 'string', description: 'Prospect phone number with country code' },
              lead_email: { type: 'string', description: 'Prospect email address' },
              appointment_type: { type: 'string', description: 'Custom appointment type (e.g. "Site Visit", "15-Min Live Screen Demo")' },
              slot_date: { type: 'string', description: 'Date of appointment (YYYY-MM-DD)' },
              slot_time: { type: 'string', description: 'Time slot (e.g. "11:30 AM", "03:00 PM")' },
              notes: { type: 'string', description: 'Specific prospect requests or preferences' },
            },
          },
        },
        {
          name: 'sales_crm_schedule_callback',
          description:
            'Schedule a follow-up callback for a busy prospect. Marks lead as WARM with callback timestamp and reason.',
          inputSchema: {
            type: 'object',
            required: ['company_slug', 'lead_phone', 'callback_time'],
            properties: {
              company_slug: { type: 'string', description: 'Company slug' },
              lead_phone: { type: 'string', description: 'Prospect phone number' },
              lead_name: { type: 'string', description: 'Prospect name' },
              callback_time: { type: 'string', description: 'Requested callback time (ISO format or spoken string e.g. "2026-11-24T17:00:00+05:30")' },
              reason: { type: 'string', description: 'Reason (e.g. "Driving right now", "In a board meeting")' },
            },
          },
        },
        {
          name: 'sales_crm_lookup_lead',
          description:
            'Lookup existing lead history, call summaries, recording URL, and scheduled appointments by phone number or reference code.',
          inputSchema: {
            type: 'object',
            required: ['company_slug', 'query'],
            properties: {
              company_slug: { type: 'string', description: 'Company slug' },
              query: { type: 'string', description: 'Phone number, lead name, or booking reference code' },
            },
          },
        },
      ],
    };
  });

  // Handle tool execution
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      if (name === 'sales_crm_list_companies') {
        const companies = await prisma.company.findMany({
          where: { isActive: true },
          include: {
            _count: { select: { offerings: true, leads: true, appointments: true } },
          },
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(companies, null, 2) }],
        };
      }

      if (name === 'sales_crm_add_company') {
        const {
          name: companyName,
          slug,
          industry,
          offering_noun,
          appointment_noun,
          currency,
          phone,
          city,
          initial_offerings,
        } = args as any;

        const company = await prisma.company.create({
          data: {
            name: companyName,
            slug: slug.toLowerCase().replace(/[^a-z0-9-]+/g, '-'),
            industry: industry || 'GENERIC_SALES',
            offeringNoun: offering_noun || 'Product / Offering',
            appointmentNoun: appointment_noun || 'Appointment / Demo',
            currency: currency || 'INR',
            phone,
            city: city || 'National',
          },
        });

        if (Array.isArray(initial_offerings)) {
          for (const off of initial_offerings) {
            await prisma.offering.create({
              data: {
                companyId: company.id,
                code: `${company.slug.toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
                title: off.title,
                price: Number(off.price) || 0,
                category: off.category || 'General',
                description: off.description,
                brochureUrl: off.brochure_url,
              },
            });
          }
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: `Company "${company.name}" successfully onboarded for live Voice AI demos!`,
                  company,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      if (name === 'sales_crm_check_offerings') {
        const { company_slug, category, budget_max, query } = args as any;
        const result = await salesService.getOfferings(company_slug, {
          category,
          budgetMax: budget_max,
          query,
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      if (name === 'sales_crm_book_appointment') {
        const {
          company_slug,
          lead_name,
          lead_phone,
          lead_email,
          appointment_type,
          slot_date,
          slot_time,
          notes,
        } = args as any;

        const result = await salesService.bookAppointment(company_slug, {
          leadName: lead_name,
          leadPhone: lead_phone,
          leadEmail: lead_email,
          appointmentType: appointment_type,
          slotDate: slot_date,
          slotTime: slot_time,
          notes,
        });

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      if (name === 'sales_crm_schedule_callback') {
        const { company_slug, lead_phone, lead_name, callback_time, reason } = args as any;
        const result = await salesService.scheduleCallback(company_slug, {
          leadPhone: lead_phone,
          leadName: lead_name,
          callbackTime: callback_time,
          reason,
        });

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      if (name === 'sales_crm_lookup_lead') {
        const { company_slug, query } = args as any;
        const result = await salesService.lookupLead(company_slug, query);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      throw new Error(`Unknown tool name: ${name}`);
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Error executing ${name}: ${error.message}` }],
      };
    }
  });

  return server;
}
