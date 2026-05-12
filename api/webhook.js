const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// Disable Vercel's body parser — required for Stripe signature verification
module.exports.config = {
  api: { bodyParser: false },
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  // Collect raw body as Buffer
  const rawBody = await new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end',  ()    => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });

  // Verify the event came from Stripe
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      req.headers['stripe-signature'],
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Fires when customer completes checkout — hold is now active
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    const amount = `$${(session.amount_total / 100).toFixed(2)}`;
    const name   = session.customer_details?.name  || 'Unknown';
    const email  = session.customer_details?.email || 'Unknown';
    const piId   = session.payment_intent;

    const slackPayload = {
      text: [
        '🔒 *Security Deposit Authorized — iExotic*',
        `*Amount held:* ${amount}`,
        `*Customer:* ${name}`,
        `*Email:* ${email}`,
        `*Payment Intent ID:* \`${piId}\``,
        '',
        '→ <https://dashboard.stripe.com/payments|Open Stripe Dashboard> to capture or release.',
      ].join('\n'),
    };

    try {
      await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slackPayload),
      });
    } catch (slackErr) {
      // Don't fail the webhook if Slack is down — Stripe needs a 200
      console.error('Slack notification failed:', slackErr);
    }
  }

  // Always return 200 to Stripe or it will retry
  res.status(200).json({ received: true });
};
