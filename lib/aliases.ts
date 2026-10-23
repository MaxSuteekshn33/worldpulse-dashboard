/**
 * Country matching terms for all 200 countries and territories.
 *
 * Matching is word-bounded, not substring. Naive `includes()` produced real
 * false positives at this scale — "Oman" inside "Romania"/"woman", "Mali"
 * inside "Somalia", "India" inside "Indiana". Because boundaries are enforced,
 * inflected forms no longer match implicitly: "India" will NOT match "Indian",
 * so every demonym is listed explicitly.
 */
export interface CountryTerms {
  /** Matched case-insensitively, on word boundaries. */
  terms: string[]
  /**
   * Matched case-SENSITIVELY. Reserved for short acronyms that collide with
   * ordinary words — "US" vs the pronoun "us", "UK", "UAE", "DRC".
   */
  acronyms?: string[]
  /**
   * Disqualifies a match when present. Resolves names nested inside other
   * country names, which word boundaries alone cannot: "Guinea" sits inside
   * "Equatorial Guinea" and "Papua New Guinea", "Sudan" inside "South Sudan",
   * "Ireland" inside "Northern Ireland", "Mexico" inside "New Mexico".
   */
  excludes?: string[]
}

export const COUNTRY_TERMS: Record<string, CountryTerms> = {
  DZ: { terms: ["Algeria", "Algerian", "Algiers"] },
  AO: { terms: ["Angola", "Angolan", "Luanda"] },
  BJ: { terms: ["Benin", "Beninese", "Porto-Novo"] },
  BW: { terms: ["Botswana", "Botswanan", "Gaborone"] },
  BF: { terms: ["Burkina Faso", "Burkinabe", "Ouagadougou"] },
  BI: { terms: ["Burundi", "Burundian", "Gitega"] },
  CV: { terms: ["Cape Verde", "Cape Verdean", "Praia"] },
  CM: { terms: ["Cameroon", "Cameroonian", "Yaounde"] },
  CF: { terms: ["Central African Republic", "Bangui"], acronyms: ["CAR"] },
  TD: { terms: ["Chad", "Chadian", "N'Djamena"] },
  KM: { terms: ["Comoros", "Comoran", "Moroni"] },
  CG: { terms: ["Republic of the Congo", "Brazzaville", "Congo-Brazzaville"], excludes: ["Democratic Republic"] },
  CD: { terms: ["DR Congo", "Kinshasa", "Democratic Republic of Congo", "Congo-Kinshasa", "Goma"], acronyms: ["DRC"] },
  DJ: { terms: ["Djibouti", "Djiboutian"] },
  EG: { terms: ["Egypt", "Egyptian", "Cairo", "Sisi"] },
  GQ: { terms: ["Equatorial Guinea", "Malabo"] },
  ER: { terms: ["Eritrea", "Eritrean", "Asmara"] },
  SZ: { terms: ["Eswatini", "Swazi", "Mbabane", "Swaziland"] },
  ET: { terms: ["Ethiopia", "Ethiopian", "Addis Ababa", "Tigray"] },
  GA: { terms: ["Gabon", "Gabonese", "Libreville"] },
  GM: { terms: ["Gambia", "Gambian", "Banjul"] },
  GH: { terms: ["Ghana", "Ghanaian", "Accra"] },
  GN: { terms: ["Guinea", "Guinean", "Conakry"], excludes: ["Equatorial Guinea", "Guinea-Bissau", "Papua New Guinea", "New Guinea", "Guinean Bissau"] },
  GW: { terms: ["Guinea-Bissau", "Bissau"] },
  CI: { terms: ["Ivory Coast", "Ivorian", "Yamoussoukro", "Cote d'Ivoire", "Côte d'Ivoire", "Abidjan"] },
  KE: { terms: ["Kenya", "Kenyan", "Nairobi", "Mombasa", "Ruto"] },
  LS: { terms: ["Lesotho", "Basotho", "Maseru"] },
  LR: { terms: ["Liberia", "Liberian", "Monrovia"] },
  LY: { terms: ["Libya", "Libyan", "Tripoli"] },
  MG: { terms: ["Madagascar", "Malagasy", "Antananarivo"] },
  MW: { terms: ["Malawi", "Malawian", "Lilongwe"] },
  ML: { terms: ["Mali", "Malian", "Bamako"] },
  MR: { terms: ["Mauritania", "Mauritanian", "Nouakchott"] },
  MU: { terms: ["Mauritius", "Mauritian", "Port Louis"] },
  MA: { terms: ["Morocco", "Moroccan", "Rabat", "Casablanca", "Marrakesh"] },
  MZ: { terms: ["Mozambique", "Mozambican", "Maputo"] },
  NA: { terms: ["Namibia", "Namibian", "Windhoek"] },
  NE: { terms: ["Niger", "Nigerien", "Niamey"], excludes: ["Niger Delta", "Nigeria", "Nigerian"] },
  NG: { terms: ["Nigeria", "Nigerian", "Abuja", "Nigerians", "Lagos", "Tinubu"] },
  RW: { terms: ["Rwanda", "Rwandan", "Kigali"] },
  ST: { terms: ["Sao Tome and Principe"] },
  SN: { terms: ["Senegal", "Senegalese", "Dakar"] },
  SC: { terms: ["Seychelles", "Seychellois", "Victoria"] },
  SL: { terms: ["Sierra Leone", "Freetown"] },
  SO: { terms: ["Somalia", "Somali", "Mogadishu"] },
  ZA: { terms: ["South Africa", "South African", "Pretoria", "Johannesburg", "Cape Town", "Ramaphosa"] },
  SS: { terms: ["South Sudan", "South Sudanese", "Juba"] },
  SD: { terms: ["Sudan", "Sudanese", "Khartoum", "Darfur"], excludes: ["South Sudan", "South Sudanese"] },
  TZ: { terms: ["Tanzania", "Tanzanian", "Dodoma"] },
  TG: { terms: ["Togo", "Togolese", "Lome"] },
  TN: { terms: ["Tunisia", "Tunisian", "Tunis"] },
  UG: { terms: ["Uganda", "Ugandan", "Kampala"] },
  ZM: { terms: ["Zambia", "Zambian", "Lusaka"] },
  ZW: { terms: ["Zimbabwe", "Zimbabwean", "Harare"] },
  AF: { terms: ["Afghanistan", "Afghan", "Kabul", "Afghans", "Taliban", "Kandahar"] },
  AM: { terms: ["Armenia", "Armenian", "Yerevan"] },
  AZ: { terms: ["Azerbaijan", "Azerbaijani", "Baku"] },
  BH: { terms: ["Bahrain", "Bahraini", "Manama"] },
  BD: { terms: ["Bangladesh", "Bangladeshi", "Dhaka", "Yunus"] },
  BT: { terms: ["Bhutan", "Bhutanese", "Thimphu"] },
  BN: { terms: ["Brunei", "Bruneian"] },
  KH: { terms: ["Cambodia", "Cambodian", "Phnom Penh"] },
  CN: { terms: ["China", "Chinese", "Beijing", "Shanghai", "Shenzhen", "Xi Jinping"] },
  GE: { terms: ["Georgia", "Georgian", "Tbilisi"] },
  HK: { terms: ["Hong Kong", "Hongkongers"] },
  IN: { terms: ["India", "Indian", "New Delhi", "Indians", "Mumbai", "Bengaluru", "Kolkata", "Chennai", "Hyderabad", "Modi"] },
  ID: { terms: ["Indonesia", "Indonesian", "Jakarta", "Bali", "Prabowo"] },
  IR: { terms: ["Iran", "Iranian", "Tehran", "Iranians", "Khamenei"] },
  IQ: { terms: ["Iraq", "Iraqi", "Baghdad", "Iraqis", "Basra", "Mosul"] },
  IL: { terms: ["Israel", "Israeli", "Jerusalem", "Israelis", "Gaza", "Tel Aviv", "Netanyahu", "Knesset"] },
  JP: { terms: ["Japan", "Japanese", "Tokyo", "Osaka", "Kyoto"] },
  JO: { terms: ["Jordan", "Jordanian", "Amman"] },
  KZ: { terms: ["Kazakhstan", "Kazakh", "Astana"] },
  KW: { terms: ["Kuwait", "Kuwaiti"] },
  KG: { terms: ["Kyrgyzstan", "Kyrgyz", "Bishkek"] },
  LA: { terms: ["Laos", "Laotian", "Vientiane"] },
  LB: { terms: ["Lebanon", "Lebanese", "Beirut", "Hezbollah"] },
  MY: { terms: ["Malaysia", "Malaysian", "Kuala Lumpur"] },
  MV: { terms: ["Maldives", "Maldivian", "Male", "Maldivians"] },
  MN: { terms: ["Mongolia", "Mongolian", "Ulaanbaatar"] },
  MM: { terms: ["Myanmar", "Burmese", "Naypyidaw", "Burma", "Yangon", "Rohingya"] },
  NP: { terms: ["Nepal", "Nepali", "Kathmandu"] },
  KP: { terms: ["North Korea", "Pyongyang", "Kim Jong Un"] },
  OM: { terms: ["Oman", "Omani", "Muscat"] },
  PK: { terms: ["Pakistan", "Pakistani", "Islamabad", "Pakistanis", "Karachi", "Lahore"] },
  PS: { terms: ["Palestine", "Palestinian", "Ramallah", "West Bank"] },
  PH: { terms: ["Philippines", "Filipino", "Manila"] },
  QA: { terms: ["Qatar", "Qatari", "Doha"] },
  SA: { terms: ["Saudi Arabia", "Saudi", "Riyadh", "Saudis", "Jeddah"] },
  SG: { terms: ["Singapore", "Singaporean"] },
  KR: { terms: ["South Korea", "Seoul"] },
  LK: { terms: ["Sri Lanka", "Sri Lankan", "Colombo"] },
  SY: { terms: ["Syria", "Syrian", "Damascus", "Aleppo"] },
  TW: { terms: ["Taiwan", "Taiwanese", "Taipei", "Taiwan Strait"] },
  TJ: { terms: ["Tajikistan", "Tajik", "Dushanbe"] },
  TH: { terms: ["Thailand", "Thai", "Bangkok"] },
  TL: { terms: ["Timor-Leste", "Dili", "East Timor"] },
  TR: { terms: ["Turkey", "Turkish", "Ankara", "Turks", "Istanbul", "Erdogan", "Türkiye"] },
  TM: { terms: ["Turkmenistan", "Turkmen", "Ashgabat"] },
  AE: { terms: ["United Arab Emirates", "Emirati", "Abu Dhabi", "Dubai", "Emirates"], acronyms: ["UAE"] },
  UZ: { terms: ["Uzbekistan", "Uzbek", "Tashkent"] },
  VN: { terms: ["Vietnam", "Vietnamese", "Hanoi"] },
  YE: { terms: ["Yemen", "Yemeni", "Sanaa", "Houthi", "Houthis"] },
  AL: { terms: ["Albania", "Albanian", "Tirana"] },
  AD: { terms: ["Andorra", "Andorran"] },
  AT: { terms: ["Austria", "Austrian", "Vienna"] },
  BY: { terms: ["Belarus", "Belarusian", "Minsk"] },
  BE: { terms: ["Belgium", "Belgian", "Brussels"] },
  BA: { terms: ["Bosnia and Herzegovina", "Bosnian", "Sarajevo"] },
  BG: { terms: ["Bulgaria", "Bulgarian", "Sofia"] },
  HR: { terms: ["Croatia", "Croatian", "Zagreb"] },
  CY: { terms: ["Cyprus", "Cypriot", "Nicosia"], excludes: ["Northern Cyprus"] },
  CZ: { terms: ["Czech Republic", "Czech", "Prague", "Czechia"] },
  DK: { terms: ["Denmark", "Danish", "Copenhagen", "Danes"] },
  EE: { terms: ["Estonia", "Estonian", "Tallinn"] },
  FI: { terms: ["Finland", "Finnish", "Helsinki", "Finns"] },
  FR: { terms: ["France", "French", "Paris", "Macron", "Marseille", "Lyon"] },
  DE: { terms: ["Germany", "German", "Berlin", "Germans", "Munich", "Frankfurt", "Bundestag", "Merz", "Scholz"] },
  GR: { terms: ["Greece", "Greek", "Athens", "Greeks", "Thessaloniki"] },
  GL: { terms: ["Greenland", "Greenlandic", "Nuuk"] },
  HU: { terms: ["Hungary", "Hungarian", "Budapest"] },
  IS: { terms: ["Iceland", "Icelandic", "Reykjavik"] },
  IE: { terms: ["Ireland", "Irish", "Dublin", "Taoiseach"], excludes: ["Northern Ireland"] },
  IT: { terms: ["Italy", "Italian", "Rome", "Italians", "Milan", "Naples", "Meloni"] },
  XK: { terms: ["Kosovo", "Kosovar", "Pristina"] },
  LV: { terms: ["Latvia", "Latvian", "Riga"] },
  LI: { terms: ["Liechtenstein", "Vaduz"] },
  LT: { terms: ["Lithuania", "Lithuanian", "Vilnius"] },
  LU: { terms: ["Luxembourg"] },
  MT: { terms: ["Malta", "Maltese", "Valletta"] },
  MD: { terms: ["Moldova", "Moldovan", "Chisinau"] },
  MC: { terms: ["Monaco", "Monegasque"] },
  ME: { terms: ["Montenegro", "Montenegrin", "Podgorica"] },
  NL: { terms: ["Netherlands", "Dutch", "Amsterdam", "The Hague", "Rotterdam"] },
  MK: { terms: ["North Macedonia", "Macedonian", "Skopje", "Macedonia"] },
  NO: { terms: ["Norway", "Norwegian", "Oslo", "Norwegians"] },
  PL: { terms: ["Poland", "Polish", "Warsaw", "Poles", "Krakow", "Tusk"] },
  PT: { terms: ["Portugal", "Portuguese", "Lisbon", "Porto"] },
  RO: { terms: ["Romania", "Romanian", "Bucharest"] },
  RU: { terms: ["Russia", "Russian", "Moscow", "Kremlin", "Putin", "Russians", "St Petersburg"] },
  SM: { terms: ["San Marino"] },
  RS: { terms: ["Serbia", "Serbian", "Belgrade"] },
  SK: { terms: ["Slovakia", "Slovak", "Bratislava"] },
  SI: { terms: ["Slovenia", "Slovenian", "Ljubljana"] },
  ES: { terms: ["Spain", "Spanish", "Madrid", "Spaniards", "Barcelona", "Sanchez"] },
  SE: { terms: ["Sweden", "Swedish", "Stockholm", "Swedes", "Gothenburg"] },
  CH: { terms: ["Switzerland", "Swiss", "Bern", "Zurich", "Geneva", "Davos"] },
  UA: { terms: ["Ukraine", "Ukrainian", "Kyiv", "Ukrainians", "Kiev", "Zelensky", "Zelenskyy", "Odesa"] },
  GB: { terms: ["United Kingdom", "British", "London", "Britain", "England", "English", "Scotland", "Scottish", "Wales", "Welsh", "Westminster", "Starmer"], acronyms: ["UK", "U.K."] },
  VA: { terms: ["Vatican City"] },
  AG: { terms: ["Antigua and Barbuda"] },
  AR: { terms: ["Argentina", "Argentine", "Buenos Aires", "Argentinian", "Milei"] },
  BS: { terms: ["Bahamas", "Bahamian", "Nassau"] },
  BB: { terms: ["Barbados", "Barbadian", "Bridgetown"] },
  BZ: { terms: ["Belize", "Belizean", "Belmopan"] },
  BO: { terms: ["Bolivia", "Bolivian", "La Paz"] },
  BR: { terms: ["Brazil", "Brazilian", "Brasilia", "Brazilians", "Sao Paulo", "São Paulo", "Rio de Janeiro", "Lula"] },
  CA: { terms: ["Canada", "Canadian", "Ottawa", "Canadians", "Toronto", "Vancouver", "Montreal", "Carney"] },
  CL: { terms: ["Chile", "Chilean", "Santiago"] },
  CO: { terms: ["Colombia", "Colombian", "Bogota"] },
  CR: { terms: ["Costa Rica", "Costa Rican", "San Jose"] },
  CU: { terms: ["Cuba", "Cuban", "Havana"] },
  DM: { terms: ["Dominica", "Roseau"], excludes: ["Dominican Republic"] },
  DO: { terms: ["Dominican Republic", "Santo Domingo"] },
  EC: { terms: ["Ecuador", "Ecuadorian", "Quito", "Noboa", "Guayaquil"] },
  SV: { terms: ["El Salvador", "Salvadoran", "San Salvador"] },
  GD: { terms: ["Grenada", "Grenadian"] },
  GT: { terms: ["Guatemala", "Guatemalan"] },
  GY: { terms: ["Guyana", "Guyanese", "Georgetown"] },
  HT: { terms: ["Haiti", "Haitian", "Port-au-Prince"] },
  HN: { terms: ["Honduras", "Honduran", "Tegucigalpa"] },
  JM: { terms: ["Jamaica", "Jamaican", "Kingston"] },
  MX: { terms: ["Mexico", "Mexican", "Mexicans", "Mexico City", "Sheinbaum"], excludes: ["New Mexico"] },
  NI: { terms: ["Nicaragua", "Nicaraguan", "Managua"] },
  PA: { terms: ["Panama", "Panamanian"] },
  PY: { terms: ["Paraguay", "Paraguayan", "Asuncion"] },
  PE: { terms: ["Peru", "Peruvian", "Lima"] },
  PR: { terms: ["Puerto Rico", "Puerto Rican", "San Juan"] },
  KN: { terms: ["Saint Kitts and Nevis", "Basseterre"] },
  LC: { terms: ["Saint Lucia", "Castries"] },
  VC: { terms: ["Saint Vincent and the Grenadines", "Kingstown"] },
  SR: { terms: ["Suriname", "Surinamese", "Paramaribo"] },
  TT: { terms: ["Trinidad and Tobago", "Trinidadian", "Port of Spain"] },
  US: { terms: ["United States", "American", "Washington", "America", "Americans", "White House", "Pentagon", "Trump", "Biden"], acronyms: ["US", "U.S.", "USA"] },
  UY: { terms: ["Uruguay", "Uruguayan", "Montevideo"] },
  VE: { terms: ["Venezuela", "Venezuelan", "Caracas", "Maduro"] },
  AU: { terms: ["Australia", "Australian", "Canberra", "Australians", "Sydney", "Melbourne", "Brisbane", "Perth", "Albanese"] },
  FJ: { terms: ["Fiji", "Fijian", "Suva"] },
  KI: { terms: ["Kiribati", "Tarawa"] },
  MH: { terms: ["Marshall Islands", "Majuro"] },
  FM: { terms: ["Micronesia", "Palikir"] },
  NR: { terms: ["Nauru"] },
  NZ: { terms: ["New Zealand", "Wellington", "New Zealanders", "Kiwi", "Auckland", "Christchurch", "Luxon"] },
  PW: { terms: ["Palau", "Ngerulmud"] },
  PG: { terms: ["Papua New Guinea", "Papuan", "Port Moresby"] },
  WS: { terms: ["Samoa", "Samoan", "Apia"], excludes: ["American Samoa"] },
  SB: { terms: ["Solomon Islands", "Honiara"] },
  TO: { terms: ["Tonga", "Tongan", "Nuku'alofa"] },
  TV: { terms: ["Tuvalu", "Funafuti"] },
  VU: { terms: ["Vanuatu", "Port Vila"] },
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Word-bounded matcher. Uses lookaround on Unicode letters rather than \b so
 * that terms containing punctuation ("U.S.", "N'Djamena") behave.
 */
function build(terms: string[], flags: string): RegExp | null {
  if (terms.length === 0) return null
  const body = terms.map(escapeRe).sort((a, b) => b.length - a.length).join('|')
  return new RegExp(`(?<!\\p{L})(?:${body})(?!\\p{L})`, flags)
}

interface Matchers { ci: RegExp | null; cs: RegExp | null; ex: RegExp | null }

const cache = new Map<string, Matchers>()

function matchersFor(code: string): Matchers {
  const key = code.toUpperCase()
  let m = cache.get(key)
  if (!m) {
    const entry = COUNTRY_TERMS[key]
    m = {
      ci: entry ? build(entry.terms, 'iu') : null,
      cs: entry?.acronyms ? build(entry.acronyms, 'u') : null,
      ex: entry?.excludes ? build(entry.excludes, 'iu') : null,
    }
    cache.set(key, m)
  }
  return m
}

export function matchesCountry(text: string, countryCode: string): boolean {
  const { ci, cs, ex } = matchersFor(countryCode)
  if (ex?.test(text)) return false
  if (ci?.test(text)) return true
  if (cs?.test(text)) return true
  return false
}

export const SUPPORTED_CODES = Object.keys(COUNTRY_TERMS)
