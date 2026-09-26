// Real Destination Travel Budget Intelligence Engine

const DESTINATION_BENCHMARKS = {
  tokyo: {
    country: 'Japan',
    tier: 'major',
    lodging: { budget: 55, standard: 155, luxury: 380 },
    food: { budget: 25, standard: 55, luxury: 140 },
    activities: { budget: 15, standard: 30, luxury: 75 },
    transit: { budget: 10, standard: 18, luxury: 50 },
    flightAvg: 850,
    currencySymbol: '¥',
    localCurrency: 'JPY',
    tips: [
      'Get a Welcome Suica or Pasmo IC card for seamless metro and convenience store payments.',
      'Enjoy high-quality lunch sets (teishoku) at department store basements (depachika) for half the dinner price.',
      'Major temple grounds like Senso-ji and Meiji Jingu have free admission.'
    ]
  },
  kyoto: {
    country: 'Japan',
    tier: 'major',
    lodging: { budget: 50, standard: 145, luxury: 350 },
    food: { budget: 22, standard: 48, luxury: 125 },
    activities: { budget: 15, standard: 28, luxury: 65 },
    transit: { budget: 8, standard: 15, luxury: 45 },
    flightAvg: 850,
    currencySymbol: '¥',
    localCurrency: 'JPY',
    tips: [
      'Kyoto Subway & Bus 1-Day Pass saves significant transit fare across Higashiyama and Arashiyama.',
      'Fushimi Inari and Arashiyama Bamboo Grove have 24/7 free entry; visit at dawn.'
    ]
  },
  paris: {
    country: 'France',
    tier: 'major',
    lodging: { budget: 70, standard: 185, luxury: 480 },
    food: { budget: 30, standard: 65, luxury: 160 },
    activities: { budget: 20, standard: 38, luxury: 85 },
    transit: { budget: 12, standard: 20, luxury: 60 },
    flightAvg: 720,
    currencySymbol: '€',
    localCurrency: 'EUR',
    tips: [
      'Book timed-entry tickets for the Louvre and Eiffel Tower at least 3 weeks in advance.',
      'A Navigo Easy pass or carnet of metro tickets is cheaper than individual single tickets.',
      'Bakeries (boulangeries) provide fresh baguettes, quiches, and pastries for under €6.'
    ]
  },
  london: {
    country: 'UK',
    tier: 'major',
    lodging: { budget: 75, standard: 195, luxury: 490 },
    food: { budget: 30, standard: 65, luxury: 150 },
    activities: { budget: 10, standard: 32, luxury: 75 },
    transit: { budget: 14, standard: 22, luxury: 65 },
    flightAvg: 680,
    currencySymbol: '£',
    localCurrency: 'GBP',
    tips: [
      'Permanent collections at the British Museum, Tate Modern, and National Gallery are completely free!',
      'Tap your contactless bank card or phone on the Tube—fares are automatically capped daily.'
    ]
  },
  rome: {
    country: 'Italy',
    tier: 'moderate',
    lodging: { budget: 60, standard: 150, luxury: 390 },
    food: { budget: 25, standard: 50, luxury: 120 },
    activities: { budget: 18, standard: 35, luxury: 75 },
    transit: { budget: 7, standard: 14, luxury: 40 },
    flightAvg: 740,
    currencySymbol: '€',
    localCurrency: 'EUR',
    tips: [
      'Book official Vatican Museums and Colosseum tickets on official sites to avoid 3x markup.',
      'Free cold potable water is available all over the city from historic fountains (nasoni).'
    ]
  },
  'new york': {
    country: 'USA',
    tier: 'major',
    lodging: { budget: 95, standard: 260, luxury: 580 },
    food: { budget: 35, standard: 75, luxury: 180 },
    activities: { budget: 22, standard: 45, luxury: 95 },
    transit: { budget: 12, standard: 20, luxury: 60 },
    flightAvg: 350,
    currencySymbol: '$',
    localCurrency: 'USD',
    tips: [
      'Use OMNY contactless on the subway; 12 rides in a Monday-Sunday week unlocks free rides thereafter.',
      'Central Park, High Line, Brooklyn Bridge, and Staten Island Ferry (Statue of Liberty view) are 100% free.'
    ]
  },
  barcelona: {
    country: 'Spain',
    tier: 'moderate',
    lodging: { budget: 55, standard: 140, luxury: 340 },
    food: { budget: 24, standard: 48, luxury: 110 },
    activities: { budget: 16, standard: 32, luxury: 70 },
    transit: { budget: 8, standard: 15, luxury: 35 },
    flightAvg: 700,
    currencySymbol: '€',
    localCurrency: 'EUR',
    tips: [
      'Pre-book Sagrada Família and Park Güell entry tickets online.',
      'Order the Menu del Día at lunchtime for 3 courses including wine for €12-€16.'
    ]
  },
  dubai: {
    country: 'UAE',
    tier: 'major',
    lodging: { budget: 65, standard: 175, luxury: 490 },
    food: { budget: 28, standard: 60, luxury: 160 },
    activities: { budget: 25, standard: 50, luxury: 110 },
    transit: { budget: 10, standard: 22, luxury: 70 },
    flightAvg: 780,
    currencySymbol: 'AED',
    localCurrency: 'AED',
    tips: [
      'Use the driverless Dubai Metro for fast travel between Dubai Mall, Marina, and the airport.',
      'Traditional abras (wooden boats) cross Dubai Creek for just 1 AED ($0.27 USD).'
    ]
  },
  bangkok: {
    country: 'Thailand',
    tier: 'value',
    lodging: { budget: 25, standard: 65, luxury: 190 },
    food: { budget: 12, standard: 25, luxury: 75 },
    activities: { budget: 10, standard: 20, luxury: 45 },
    transit: { budget: 5, standard: 12, luxury: 28 },
    flightAvg: 850,
    currencySymbol: '฿',
    localCurrency: 'THB',
    tips: [
      'World-class street food at night markets provides Michelin-recognized dishes for $3-$6.',
      'Use the BTS Skytrain, MRT, and Chao Phraya Express Boat to easily bypass Bangkok traffic.'
    ]
  },
  bali: {
    country: 'Indonesia',
    tier: 'value',
    lodging: { budget: 25, standard: 70, luxury: 220 },
    food: { budget: 12, standard: 25, luxury: 65 },
    activities: { budget: 10, standard: 22, luxury: 50 },
    transit: { budget: 8, standard: 18, luxury: 40 },
    flightAvg: 920,
    currencySymbol: 'Rp',
    localCurrency: 'IDR',
    tips: [
      'Renting a scooter or hiring a private daily driver ($35-$45/day) is the standard way to explore.',
      'Local warungs serve fresh traditional Nasi Goreng and Mie Goreng for under $3 USD.'
    ]
  },
  cairo: {
    country: 'Egypt',
    tier: 'value',
    lodging: { budget: 28, standard: 75, luxury: 210 },
    food: { budget: 10, standard: 22, luxury: 60 },
    activities: { budget: 12, standard: 25, luxury: 55 },
    transit: { budget: 5, standard: 12, luxury: 28 },
    flightAvg: 800,
    currencySymbol: 'E£',
    localCurrency: 'EGP',
    tips: [
      'Book official entry tickets for the Giza Pyramids and Grand Egyptian Museum via official ministry portals.',
      'Uber is reliable and prevents haggling over street taxi fares.'
    ]
  },
  dhaka: {
    country: 'Bangladesh',
    tier: 'value',
    lodging: { budget: 22, standard: 60, luxury: 160 },
    food: { budget: 8, standard: 18, luxury: 50 },
    activities: { budget: 6, standard: 15, luxury: 35 },
    transit: { budget: 4, standard: 10, luxury: 25 },
    flightAvg: 950,
    currencySymbol: '৳',
    localCurrency: 'BDT',
    tips: [
      'Take the Dhaka Metro Rail (MRT Line 6) to bypass congested road corridors quickly.',
      'Old Dhaka biryani and local street food provide extraordinary authentic culinary experiences.'
    ]
  }
};

// Generic fallback benchmark for destinations not explicitly mapped
const GLOBAL_FALLBACK = {
  country: 'Worldwide',
  tier: 'moderate',
  lodging: { budget: 55, standard: 145, luxury: 360 },
  food: { budget: 24, standard: 50, luxury: 120 },
  activities: { budget: 15, standard: 30, luxury: 70 },
  transit: { budget: 8, standard: 16, luxury: 40 },
  flightAvg: 750,
  currencySymbol: '$',
  localCurrency: 'USD',
  tips: [
    'Save receipts and check local public transit multi-day passes for maximum savings.',
    'Book key attractions and accommodations at least 2 to 4 weeks in advance.'
  ]
};

/**
 * Resolve benchmark data for a destination
 */
export function getDestinationBenchmark(destinationName) {
  if (!destinationName) return GLOBAL_FALLBACK;
  const clean = destinationName.toLowerCase().trim();

  for (const [key, data] of Object.entries(DESTINATION_BENCHMARKS)) {
    if (clean.includes(key)) {
      return data;
    }
  }

  return GLOBAL_FALLBACK;
}

/**
 * Calculate complete trip budget estimate
 * @param {string} destination - Destination name (e.g. "Tokyo", "Paris")
 * @param {number} daysCount - Duration in days (e.g. 5)
 * @param {string} travelStyle - 'budget' | 'standard' | 'luxury'
 * @param {number} travelers - Number of travelers (default 1)
 * @param {boolean} includeFlights - Whether to include return flight in estimate
 */
export function calculateTripBudget(
  destination,
  daysCount = 5,
  travelStyle = 'standard',
  travelers = 1,
  includeFlights = false
) {
  const benchmark = getDestinationBenchmark(destination);
  const style = ['budget', 'standard', 'luxury'].includes(travelStyle) ? travelStyle : 'standard';
  const days = Math.max(1, parseInt(daysCount) || 5);
  const nights = Math.max(1, days - 1);
  const pax = Math.max(1, parseInt(travelers) || 1);

  const lodgingPerNight = benchmark.lodging[style];
  const foodPerDay = benchmark.food[style];
  const activitiesPerDay = benchmark.activities[style];
  const transitPerDay = benchmark.transit[style];

  // Lodging subtotal (shared between up to 2 travelers in a standard room)
  const roomCount = Math.ceil(pax / 2);
  const lodgingSubtotal = lodgingPerNight * nights * roomCount;

  // Individual expenses per day
  const foodSubtotal = foodPerDay * days * pax;
  const activitiesSubtotal = activitiesPerDay * days * pax;
  const transitSubtotal = transitPerDay * days * pax;

  // Flight estimate
  const flightPerPerson = Math.round(benchmark.flightAvg * (style === 'luxury' ? 2.5 : style === 'budget' ? 0.85 : 1));
  const flightSubtotal = includeFlights ? flightPerPerson * pax : 0;

  const groundTotal = lodgingSubtotal + foodSubtotal + activitiesSubtotal + transitSubtotal;
  const grandTotal = groundTotal + flightSubtotal;
  const dailyAveragePerPerson = Math.round(groundTotal / days / pax);

  return {
    destination,
    daysCount: days,
    nightsCount: nights,
    travelStyle: style,
    travelers: pax,
    rates: {
      lodgingPerNight,
      foodPerDay,
      activitiesPerDay,
      transitPerDay,
      flightPerPerson
    },
    subtotals: {
      lodging: lodgingSubtotal,
      food: foodSubtotal,
      activities: activitiesSubtotal,
      transit: transitSubtotal,
      flights: flightSubtotal
    },
    groundTotal,
    grandTotal,
    dailyAveragePerPerson,
    breakdownPercent: {
      lodging: Math.round((lodgingSubtotal / groundTotal) * 100) || 40,
      food: Math.round((foodSubtotal / groundTotal) * 100) || 30,
      activities: Math.round((activitiesSubtotal / groundTotal) * 100) || 18,
      transit: Math.round((transitSubtotal / groundTotal) * 100) || 12
    },
    tips: benchmark.tips || GLOBAL_FALLBACK.tips,
    currencySymbol: benchmark.currencySymbol,
    localCurrency: benchmark.localCurrency
  };
}
