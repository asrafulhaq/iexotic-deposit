module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const cents = parseInt(process.env.DEPOSIT_AMOUNT_CENTS, 10);

  const display = cents
    ? '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
    : '$1,000';

  const displayFull = cents
    ? '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '$1,000.00';

  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
  res.status(200).json({ display, displayFull, cents: cents || 100000 });
};
