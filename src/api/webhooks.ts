import { Router, Request, Response } from 'express';
import { salesService } from '../services/sales.js';

export const webhooksRouter = Router();

// POST /api/webhooks/call-completed - Talkar Post-Call intelligence receiver
webhooksRouter.post('/call-completed', async (req: Request, res: Response) => {
  try {
    console.log(`\n📞 [Talkar Webhook] Received post-call data:`, JSON.stringify(req.body, null, 2));

    const result = await salesService.processCallWebhook(req.body);

    res.json({
      success: true,
      message: 'Call variables processed and CRM Kanban updated',
      data: result,
    });
  } catch (err: any) {
    console.error('Webhook error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});
