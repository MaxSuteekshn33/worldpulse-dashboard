/**
 * Country matching terms.
 *
 * Matching is word-bounded, not substring. Naive `includes()` produced real
 * false positives at this scale — "Oman" inside "Romania"/"woman", "Mali"
 * inside "Somalia", "India" inside "Indiana". Because boundaries are enforced,
 * inflected forms no longer match implicitly: "India" will NOT match "Indian",
 * so every adjective/demonym is listed explicitly.
 */
export interface CountryTerms {
  /** Matched case-insensitively, on word boundaries. */
  terms: string[]
  /**
   * Matched case-SENSITIVELY. Reserved for short acronyms that collide with
   * ordinary words — "US" vs the pronoun "us", "UK", "UAE", "EU".
   */
  acronyms?: string[]
}

export const COUNTRY_TERMS: Record<string, CountryTerms> = {
  // ── Original 50 ────────────────────────────────────────────
  IN: { terms: ['India', 'Indian', 'Indians', 'New Delhi', 'Mumbai', 'Bengaluru', 'Kolkata', 'Chennai', 'Hyderabad', 'Modi'] },
  US: { terms: ['United States', 'America', 'American', 'Americans', 'Washington', 'Trump', 'Biden', 'White House', 'Pentagon'], acronyms: ['US', 'U.S.', 'USA'] },
  GB: { terms: ['Britain', 'British', 'United Kingdom', 'London', 'England', 'English', 'Scotland', 'Scottish', 'Wales', 'Welsh', 'Starmer', 'Westminster'], acronyms: ['UK', 'U.K.'] },
  AU: { terms: ['Australia', 'Australian', 'Australians', 'Sydney', 'Melbourne', 'Canberra', 'Brisbane', 'Perth', 'Albanese'] },
  CN: { terms: ['China', 'Chinese', 'Beijing', 'Shanghai', 'Xi Jinping', 'Shenzhen'] },
  RU: { terms: ['Russia', 'Russian', 'Russians', 'Moscow', 'Putin', 'Kremlin', 'St Petersburg'] },
  DE: { terms: ['Germany', 'German', 'Germans', 'Berlin', 'Munich', 'Frankfurt', 'Scholz', 'Merz', 'Bundestag'] },
  FR: { terms: ['France', 'French', 'Paris', 'Macron', 'Marseille', 'Lyon'] },
  JP: { terms: ['Japan', 'Japanese', 'Tokyo', 'Osaka', 'Kyoto'] },
  BR: { terms: ['Brazil', 'Brazilian', 'Brazilians', 'Brasilia', 'Sao Paulo', 'São Paulo', 'Rio de Janeiro', 'Lula'] },
  CA: { terms: ['Canada', 'Canadian', 'Canadians', 'Ottawa', 'Toronto', 'Vancouver', 'Montreal', 'Carney'] },
  ZA: { terms: ['South Africa', 'South African', 'Johannesburg', 'Cape Town', 'Pretoria', 'Ramaphosa'] },
  NG: { terms: ['Nigeria', 'Nigerian', 'Nigerians', 'Lagos', 'Abuja', 'Tinubu'] },
  MX: { terms: ['Mexico', 'Mexican', 'Mexicans', 'Mexico City', 'Sheinbaum'] },
  AR: { terms: ['Argentina', 'Argentine', 'Argentinian', 'Buenos Aires', 'Milei'] },
  EG: { terms: ['Egypt', 'Egyptian', 'Egyptians', 'Cairo', 'Sisi'] },
  IL: { terms: ['Israel', 'Israeli', 'Israelis', 'Gaza', 'Tel Aviv', 'Jerusalem', 'Netanyahu', 'Knesset'] },
  SA: { terms: ['Saudi Arabia', 'Saudi', 'Saudis', 'Riyadh', 'Jeddah'] },
  PK: { terms: ['Pakistan', 'Pakistani', 'Pakistanis', 'Islamabad', 'Karachi', 'Lahore'] },
  KR: { terms: ['South Korea', 'South Korean', 'Seoul', 'Busan'] },
  IT: { terms: ['Italy', 'Italian', 'Italians', 'Rome', 'Milan', 'Naples', 'Meloni'] },
  UA: { terms: ['Ukraine', 'Ukrainian', 'Ukrainians', 'Kyiv', 'Kiev', 'Zelensky', 'Zelenskyy', 'Odesa'] },
  TR: { terms: ['Turkey', 'Turkish', 'Turks', 'Ankara', 'Istanbul', 'Erdogan', 'Türkiye'] },
  ID: { terms: ['Indonesia', 'Indonesian', 'Indonesians', 'Jakarta', 'Bali', 'Prabowo'] },
  NL: { terms: ['Netherlands', 'Dutch', 'Amsterdam', 'Rotterdam', 'The Hague'] },
  ES: { terms: ['Spain', 'Spanish', 'Spaniards', 'Madrid', 'Barcelona', 'Sanchez'] },
  SE: { terms: ['Sweden', 'Swedish', 'Swedes', 'Stockholm', 'Gothenburg'] },
  NO: { terms: ['Norway', 'Norwegian', 'Norwegians', 'Oslo'] },
  PL: { terms: ['Poland', 'Polish', 'Poles', 'Warsaw', 'Krakow', 'Tusk'] },
  CH: { terms: ['Switzerland', 'Swiss', 'Zurich', 'Geneva', 'Bern', 'Davos'] },
  BE: { terms: ['Belgium', 'Belgian', 'Belgians', 'Brussels', 'Antwerp'] },
  PT: { terms: ['Portugal', 'Portuguese', 'Lisbon', 'Porto'] },
  GR: { terms: ['Greece', 'Greek', 'Greeks', 'Athens', 'Thessaloniki'] },
  AE: { terms: ['United Arab Emirates', 'Dubai', 'Abu Dhabi', 'Emirati', 'Emirates'], acronyms: ['UAE'] },
  IR: { terms: ['Iran', 'Iranian', 'Iranians', 'Tehran', 'Khamenei'] },
  IQ: { terms: ['Iraq', 'Iraqi', 'Iraqis', 'Baghdad', 'Basra', 'Mosul'] },
  SG: { terms: ['Singapore', 'Singaporean', 'Singaporeans'] },
  MY: { terms: ['Malaysia', 'Malaysian', 'Malaysians', 'Kuala Lumpur', 'Anwar Ibrahim'] },
  TH: { terms: ['Thailand', 'Thai', 'Bangkok', 'Phuket'] },
  PH: { terms: ['Philippines', 'Filipino', 'Filipinos', 'Philippine', 'Manila', 'Marcos'] },
  VN: { terms: ['Vietnam', 'Vietnamese', 'Hanoi', 'Ho Chi Minh'] },
  BD: { terms: ['Bangladesh', 'Bangladeshi', 'Bangladeshis', 'Dhaka', 'Yunus'] },
  KE: { terms: ['Kenya', 'Kenyan', 'Kenyans', 'Nairobi', 'Mombasa', 'Ruto'] },
  ET: { terms: ['Ethiopia', 'Ethiopian', 'Ethiopians', 'Addis Ababa', 'Tigray'] },
  GH: { terms: ['Ghana', 'Ghanaian', 'Ghanaians', 'Accra'] },
  CO: { terms: ['Colombia', 'Colombian', 'Colombians', 'Bogota', 'Bogotá', 'Medellin', 'Petro'] },
  CL: { terms: ['Chile', 'Chilean', 'Chileans', 'Santiago', 'Boric'] },
  AT: { terms: ['Austria', 'Austrian', 'Austrians', 'Vienna', 'Salzburg'] },
  CZ: { terms: ['Czech', 'Czechia', 'Czech Republic', 'Prague'] },
  HU: { terms: ['Hungary', 'Hungarian', 'Hungarians', 'Budapest', 'Orban', 'Orbán'] },

  // ── Oceania ────────────────────────────────────────────────
  NZ: { terms: ['New Zealand', 'Kiwi', 'Auckland', 'Wellington', 'Christchurch', 'Luxon'] },
  PG: { terms: ['Papua New Guinea', 'Papuan', 'Port Moresby'] },

  // ── Europe ─────────────────────────────────────────────────
  IE: { terms: ['Ireland', 'Irish', 'Dublin', 'Cork', 'Dail', 'Taoiseach'] },
  DK: { terms: ['Denmark', 'Danish', 'Danes', 'Copenhagen', 'Greenland'] },
  FI: { terms: ['Finland', 'Finnish', 'Finns', 'Helsinki'] },
  RO: { terms: ['Romania', 'Romanian', 'Romanians', 'Bucharest'] },
  BG: { terms: ['Bulgaria', 'Bulgarian', 'Bulgarians', 'Sofia'] },
  HR: { terms: ['Croatia', 'Croatian', 'Croatians', 'Zagreb', 'Dubrovnik'] },
  RS: { terms: ['Serbia', 'Serbian', 'Serbs', 'Belgrade', 'Vucic'] },
  SK: { terms: ['Slovakia', 'Slovak', 'Slovaks', 'Bratislava', 'Fico'] },
  SI: { terms: ['Slovenia', 'Slovenian', 'Slovenes', 'Ljubljana'] },
  LT: { terms: ['Lithuania', 'Lithuanian', 'Lithuanians', 'Vilnius'] },
  EE: { terms: ['Estonia', 'Estonian', 'Estonians', 'Tallinn'] },
  IS: { terms: ['Iceland', 'Icelandic', 'Icelanders', 'Reykjavik'] },
  BY: { terms: ['Belarus', 'Belarusian', 'Belarusians', 'Minsk', 'Lukashenko'] },

  // ── Asia ───────────────────────────────────────────────────
  TW: { terms: ['Taiwan', 'Taiwanese', 'Taipei', 'Taiwan Strait'] },
  HK: { terms: ['Hong Kong', 'Hongkongers'] },
  NP: { terms: ['Nepal', 'Nepali', 'Nepalese', 'Kathmandu', 'Everest'] },
  LK: { terms: ['Sri Lanka', 'Sri Lankan', 'Sri Lankans', 'Colombo'] },
  MM: { terms: ['Myanmar', 'Burma', 'Burmese', 'Yangon', 'Naypyidaw', 'Rohingya'] },
  KH: { terms: ['Cambodia', 'Cambodian', 'Cambodians', 'Phnom Penh'] },
  MN: { terms: ['Mongolia', 'Mongolian', 'Mongolians', 'Ulaanbaatar'] },
  KZ: { terms: ['Kazakhstan', 'Kazakh', 'Kazakhs', 'Astana', 'Almaty'] },
  UZ: { terms: ['Uzbekistan', 'Uzbek', 'Uzbeks', 'Tashkent', 'Samarkand'] },
  AF: { terms: ['Afghanistan', 'Afghan', 'Afghans', 'Kabul', 'Taliban', 'Kandahar'] },
  AZ: { terms: ['Azerbaijan', 'Azerbaijani', 'Azeri', 'Baku', 'Nagorno-Karabakh'] },
  GE: { terms: ['Georgia', 'Georgian', 'Georgians', 'Tbilisi'] },
  AM: { terms: ['Armenia', 'Armenian', 'Armenians', 'Yerevan'] },
  KP: { terms: ['North Korea', 'North Korean', 'Pyongyang', 'Kim Jong Un'] },

  // ── Middle East ────────────────────────────────────────────
  QA: { terms: ['Qatar', 'Qatari', 'Qataris', 'Doha'] },
  KW: { terms: ['Kuwait', 'Kuwaiti', 'Kuwaitis'] },
  OM: { terms: ['Oman', 'Omani', 'Omanis', 'Muscat'] },
  JO: { terms: ['Jordan', 'Jordanian', 'Jordanians', 'Amman'] },
  LB: { terms: ['Lebanon', 'Lebanese', 'Beirut', 'Hezbollah'] },
  SY: { terms: ['Syria', 'Syrian', 'Syrians', 'Damascus', 'Aleppo'] },
  YE: { terms: ['Yemen', 'Yemeni', 'Yemenis', 'Sanaa', 'Houthi', 'Houthis'] },

  // ── Africa ─────────────────────────────────────────────────
  MA: { terms: ['Morocco', 'Moroccan', 'Moroccans', 'Rabat', 'Casablanca', 'Marrakesh'] },
  DZ: { terms: ['Algeria', 'Algerian', 'Algerians', 'Algiers'] },
  TN: { terms: ['Tunisia', 'Tunisian', 'Tunisians', 'Tunis'] },
  LY: { terms: ['Libya', 'Libyan', 'Libyans', 'Tripoli', 'Benghazi'] },
  SD: { terms: ['Sudan', 'Sudanese', 'Khartoum', 'Darfur'] },
  TZ: { terms: ['Tanzania', 'Tanzanian', 'Tanzanians', 'Dar es Salaam', 'Dodoma', 'Zanzibar'] },
  UG: { terms: ['Uganda', 'Ugandan', 'Ugandans', 'Kampala', 'Museveni'] },
  ZW: { terms: ['Zimbabwe', 'Zimbabwean', 'Zimbabweans', 'Harare'] },
  CD: { terms: ['Democratic Republic of Congo', 'DR Congo', 'Congolese', 'Kinshasa', 'Goma'], acronyms: ['DRC'] },

  // ── Americas ───────────────────────────────────────────────
  PE: { terms: ['Peru', 'Peruvian', 'Peruvians', 'Lima'] },
  VE: { terms: ['Venezuela', 'Venezuelan', 'Venezuelans', 'Caracas', 'Maduro'] },
  EC: { terms: ['Ecuador', 'Ecuadorian', 'Ecuadorians', 'Quito', 'Guayaquil', 'Noboa'] },
  BO: { terms: ['Bolivia', 'Bolivian', 'Bolivians', 'La Paz', 'Sucre'] },
  UY: { terms: ['Uruguay', 'Uruguayan', 'Uruguayans', 'Montevideo'] },
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Word-bounded matcher. Uses lookaround on Unicode letters rather than \b so
 * that terms containing punctuation ("U.S.", "Nagorno-Karabakh") behave.
 */
function build(terms: string[], flags: string): RegExp | null {
  if (terms.length === 0) return null
  const body = terms.map(escapeRe).sort((a, b) => b.length - a.length).join('|')
  return new RegExp(`(?<!\\p{L})(?:${body})(?!\\p{L})`, flags)
}

const cache = new Map<string, { ci: RegExp | null; cs: RegExp | null }>()

function matchersFor(code: string) {
  const key = code.toUpperCase()
  let m = cache.get(key)
  if (!m) {
    const entry = COUNTRY_TERMS[key]
    m = {
      ci: entry ? build(entry.terms, 'iu') : null,
      cs: entry?.acronyms ? build(entry.acronyms, 'u') : null,
    }
    cache.set(key, m)
  }
  return m
}

export function matchesCountry(text: string, countryCode: string): boolean {
  const { ci, cs } = matchersFor(countryCode)
  if (ci?.test(text)) return true
  if (cs?.test(text)) return true
  return false
}

export const SUPPORTED_CODES = Object.keys(COUNTRY_TERMS)
