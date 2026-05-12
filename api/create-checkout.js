const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Amount in cents from env var. Change DEPOSIT_AMOUNT_CENTS in Vercel to update
    // without touching code. Examples: 100000 = $1,000 | 50000 = $500
    const amount = parseInt(process.env.DEPOSIT_AMOUNT_CENTS, 10) || 100000;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],

      payment_intent_data: {
        // Critical: hold funds without charging — must be inside payment_intent_data
        capture_method: 'manual',
        description: 'iExotic Vehicle Rental Security Deposit',
      },

      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Security Deposit — iExotic Rental',
            description: 'Refundable authorization hold. Released after vehicle return and inspection.',
          },
          unit_amount: amount,
        },
        quantity: 1,
      }],

      success_url: `${process.env.SITE_URL}/success.html`,
      cancel_url:  `${process.env.SITE_URL}/`,
    });

    res.redirect(303, session.url);

  } catch (err) {
    console.error('Stripe error:', err);
    res.status(500).json({ error: err.message });
  }
};
