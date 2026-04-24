export const FEE_DEFINITIONS = [
  {
    label: 'Driver',
    rawField: 'raw_driver_fee',
    numericField: 'event_driver_fee',
    offerName: 'Driver Entry'
  },
  {
    label: 'Spectator',
    rawField: 'raw_spectator_fee',
    numericField: 'event_spectator_fee',
    offerName: 'Spectator Entry'
  }
];

export function getEventFeeLabels(event) {
  return FEE_DEFINITIONS
    .map(({ label, rawField, numericField }) => {
      const rawValue = event[rawField];
      const numericValue = event[numericField];
      return rawValue || numericValue ? `${label}: ${rawValue || `$${numericValue}`}` : null;
    })
    .filter(Boolean);
}

export function formatEventFees(event) {
  const fees = getEventFeeLabels(event);
  return fees.length ? fees.join(' | ') : 'Contact track for pricing';
}

export function getPricedOffers(event) {
  return FEE_DEFINITIONS
    .filter(({ numericField }) => event[numericField])
    .map(({ numericField, offerName }) => ({
      '@type': 'Offer',
      name: offerName,
      price: event[numericField],
      priceCurrency: 'USD'
    }));
}
