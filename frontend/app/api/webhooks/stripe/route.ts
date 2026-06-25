import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-06-24.dahlia', // Assicurati sia la tua versione
});

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;

  try {
    const event = stripe.webhooks.constructEvent(
      body, 
      sig, 
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    // Gestisci l'evento
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      console.log('Pagamento completato!', session.id);
      // QUI va la logica per aggiornare il tuo DB (es. supabase)
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    return NextResponse.json({ error: 'Webhook Error' }, { status: 400 });
  }
}