/**
 * Kenyan Counties - Complete list of all 47 counties
 */
export const kenyanCounties = [
  'All Counties',
  'Nairobi',
  'Mombasa',
  'Kisumu',
  'Nakuru',
  'Uasin Gishu',
  'Kiambu',
  'Machakos',
  'Kajiado',
  'Nyeri',
  'Meru',
  'Kisii',
  'Kakamega',
  'Bungoma',
  'Kilifi',
  'Kwale',
  'Garissa',
  'Wajir',
  'Mandera',
  'Marsabit',
  'Isiolo',
  'Turkana',
  'West Pokot',
  'Samburu',
  'Trans Nzoia',
  'Baringo',
  'Elgeyo-Marakwet',
  'Nandi',
  'Laikipia',
  'Murang\'a',
  'Kirinyaga',
  'Embu',
  'Tharaka-Nithi',
  'Kitui',
  'Makueni',
  'Nyandarua',
  'Nyamira',
  'Vihiga',
  'Busia',
  'Siaya',
  'Homa Bay',
  'Migori',
  'Taita-Taveta',
  'Lamu',
  'Tana River',
  'Narok',
  'Kericho',
  'Bomet',
];

/**
 * Popular areas/estates by county for quick selection
 */
export const popularAreasByCounty: Record<string, string[]> = {
  'Nairobi': [
    'Westlands',
    'Kilimani',
    'Lavington',
    'Karen',
    'Runda',
    'Parklands',
    'Kileleshwa',
    'Upperhill',
    'South B',
    'South C',
    'Langata',
    'Ngong Road',
    'Kasarani',
    'Roysambu',
    'Ruaka',
    'Kahawa West',
    'Kahawa Sukari',
    'Thome',
    'Zimmerman',
    'Pipeline',
    'Embakasi',
    'Donholm',
    'Buruburu',
    'Umoja',
    'Komarock',
    'Kayole',
    'Ruai',
    'Kitengela'
  ],
  'Kiambu': [
    'Thika',
    'Ruiru',
    'Juja',
    'Kikuyu',
    'Limuru',
    'Karuri',
    'Kiambu Town',
    'Githunguri'
  ],
  'Machakos': [
    'Machakos Town',
    'Kenya Israel',
    'Isuzu',
    'Miwani',
    'ABC',
    'Katoloni',
    'Machakos University',
    'Katelembu',
    'Machakos Girls',
    'Sokoni',
    'Mtituni',
    'Sweetwaters',
    'Tumba',
    'Scotts University',
    'Machakos Academy',
    'Masii',
    'Athi River',
    'Mlolongo'
  ],
  'Mombasa': [
    'Nyali',
    'Bamburi',
    'Shanzu',
    'Kisauni',
    'Likoni',
    'Changamwe',
    'Mvita',
    'Mombasa CBD'
  ],
  'Kisumu': [
    'Milimani',
    'Mamboleo',
    'Nyalenda',
    'Kisumu CBD',
    'Kondele',
    'Tom Mboya'
  ],
  'Nakuru': [
    'Nakuru CBD',
    'Milimani',
    'Section 58',
    'Lanet',
    'Pipeline',
    'Bondeni',
    'Naivasha'
  ],
  'Uasin Gishu': [
    'Eldoret CBD',
    'Pioneer',
    'Elgon View',
    'Kapsoya',
    'Langas',
    'Kipkenyo'
  ],
};

/**
 * Legacy locations array - kept for backward compatibility
 * Use kenyanCounties for new implementations
 * @deprecated Use kenyanCounties instead
 */
export const locations = kenyanCounties;

export const houseTypes = ['All', 'Bedsitter', 'Single Room', '1 Bedroom', '2 Bedroom', 'House', 'Hostel', 'Business'];

const residentialFeatures = [
    'Tiled Floors', 
    'Constant Water', 
    'Parking', 
    'Balcony', 
    'Secure Compound', 
    'Token Electricity',
    'Wi-Fi Available',
    'CCTV Surveillance',
    'Ladies Only',
    'Gents Only',
    'Inside Campus',
    'Outside Campus',
    'Shared Rooms',
    'Private Rooms',
    'Smart Home Ready',
    'Garden Lounge',
    'Dual Parking Bays',
    'Panic Room',
    'Walk-in Closets',
    'Heated Swimming Pool',
    'Clubhouse Access',
    '24/7 Concierge',
];

const businessFeatures = [
    'High Foot Traffic',
    'Roadside Access',
    'Parking',
    'Secure Compound',
    'Three Phase Power',
    'Water Access',
    'Restroom Available',
    'Loading Bay',
    'Wi-Fi Available',
    'CCTV Surveillance',
    'VIP Conference Suite',
    'Private Boardroom',
    'Showroom Lighting',
    'Executive Reception',
    'Dedicated Lift Access',
];

export const allFeatureOptions = {
    residential: residentialFeatures,
    business: businessFeatures
};
