export function getEventFeeLabels(event) {
  const fees = [];
  if (event.raw_driver_fee || event.event_driver_fee) {
    fees.push(`Driver: ${event.raw_driver_fee || `$${event.event_driver_fee}`}`);
  }
  if (event.raw_spectator_fee || event.event_spectator_fee) {
    fees.push(`Spectator: ${event.raw_spectator_fee || `$${event.event_spectator_fee}`}`);
  }
  return fees;
}

export function formatEventFees(event) {
  const fees = getEventFeeLabels(event);
  return fees.length ? fees.join(' | ') : 'Contact track for pricing';
}

export function getPricedOffers(event) {
  const offers = [];

  if (event.event_driver_fee) {
    offers.push({
      '@type': 'Offer',
      name: 'Driver Entry',
      price: event.event_driver_fee,
      priceCurrency: 'USD'
    });
  }

  if (event.event_spectator_fee) {
    offers.push({
      '@type': 'Offer',
      name: 'Spectator Entry',
      price: event.event_spectator_fee,
      priceCurrency: 'USD'
    });
  }

  return offers;
}
