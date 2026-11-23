import { prisma } from '../lib/prisma.js';
import { salesService } from './sales.js';
import { eventService } from './events.js';

export class CallbackSchedulerService {
  private timer: NodeJS.Timeout | null = null;
  private isProcessing = false;

  /**
   * Start autonomous background scheduler
   * Checks every intervalMs (default 30 seconds) for due callbacks
   */
  start(intervalMs = 30000) {
    if (this.timer) return;
    console.log(`⏰ [Callback Scheduler] Autonomous follow-up runner started (polling every ${intervalMs / 1000}s)`);
    this.timer = setInterval(() => this.checkAndTriggerCallbacks(), intervalMs);
    // Initial check after 3 seconds on boot
    setTimeout(() => this.checkAndTriggerCallbacks(), 3000);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log('⏰ [Callback Scheduler] Autonomous follow-up runner stopped.');
    }
  }

  async checkAndTriggerCallbacks() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const now = new Date();

      // Find all qualified leads across all active companies whose callbackAt is due
      const dueLeads = await prisma.lead.findMany({
        where: {
          stage: 'QUALIFIED',
          callbackAt: {
            lte: now,
            not: null,
          },
        },
        include: {
          company: true,
        },
      });

      if (dueLeads.length === 0) {
        this.isProcessing = false;
        return;
      }

      console.log(`⏰ [Callback Scheduler] Found ${dueLeads.length} lead(s) due for scheduled callback at ${now.toISOString()}`);

      for (const lead of dueLeads) {
        try {
          const reason = lead.callbackReason || 'Agreed callback';
          console.log(`📞 [Auto-Dial] Calling ${lead.name} (${lead.phone}) for ${lead.company.name} [Reason: ${reason}]...`);

          const timestamp = now.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          });

          const autoNote = `[${timestamp}] 🤖 Autonomous Follow-up AI Call Dispatched (Reason: ${reason})`;
          const updatedNotes = lead.notes ? `${lead.notes}\n${autoNote}` : autoNote;

          // Consume the callback timestamp so it doesn't trigger again
          await prisma.lead.update({
            where: { id: lead.id },
            data: {
              callbackAt: null,
              notes: updatedNotes,
            },
          });

          // Trigger the Talkar Voice AI call
          const callResult = await salesService.triggerAiCall(lead.company.slug, lead.id);

          eventService.broadcast(
            'lead_updated',
            {
              companySlug: lead.company.slug,
              leadId: lead.id,
              leadName: lead.name,
              leadPhone: lead.phone,
              stage: lead.stage,
              callbackAt: null,
              notes: updatedNotes,
              message: `Autonomous scheduled follow-up call initiated to ${lead.name}`,
              callResult,
            },
            lead.company.slug
          );

          console.log(`✅ [Auto-Dial] Autonomous callback launched for ${lead.name} (${lead.phone})`);
        } catch (callErr: any) {
          console.error(`❌ [Auto-Dial Error] Failed to call lead ${lead.name} (${lead.id}):`, callErr.message);
        }
      }
    } catch (err: any) {
      console.error('❌ [Callback Scheduler Error]:', err.message);
    } finally {
      this.isProcessing = false;
    }
  }
}

export const callbackScheduler = new CallbackSchedulerService();
