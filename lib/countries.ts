export interface CountryMeta {
  code: string
  name: string
  lat: number
  lng: number
  flag: string
  newsApiCode: string // NewsAPI country code (sometimes different)
}

export const COUNTRIES: CountryMeta[] = [
  { code: 'IN', name: 'India',          lat: 20.59,   lng: 78.96,   flag: '🇮🇳', newsApiCode: 'in' },
  { code: 'US', name: 'United States',  lat: 37.09,   lng: -95.71,  flag: '🇺🇸', newsApiCode: 'us' },
  { code: 'GB', name: 'United Kingdom', lat: 55.37,   lng: -3.43,   flag: '🇬🇧', newsApiCode: 'gb' },
  { code: 'AU', name: 'Australia',      lat: -25.27,  lng: 133.77,  flag: '🇦🇺', newsApiCode: 'au' },
  { code: 'CN', name: 'China',          lat: 35.86,   lng: 104.19,  flag: '🇨🇳', newsApiCode: 'cn' },
  { code: 'RU', name: 'Russia',         lat: 61.52,   lng: 105.31,  flag: '🇷🇺', newsApiCode: 'ru' },
  { code: 'DE', name: 'Germany',        lat: 51.16,   lng: 10.45,   flag: '🇩🇪', newsApiCode: 'de' },
  { code: 'FR', name: 'France',         lat: 46.22,   lng: 2.21,    flag: '🇫🇷', newsApiCode: 'fr' },
  { code: 'JP', name: 'Japan',          lat: 36.20,   lng: 138.25,  flag: '🇯🇵', newsApiCode: 'jp' },
  { code: 'BR', name: 'Brazil',         lat: -14.23,  lng: -51.92,  flag: '🇧🇷', newsApiCode: 'br' },
  { code: 'CA', name: 'Canada',         lat: 56.13,   lng: -106.34, flag: '🇨🇦', newsApiCode: 'ca' },
  { code: 'ZA', name: 'South Africa',   lat: -30.55,  lng: 22.93,   flag: '🇿🇦', newsApiCode: 'za' },
  { code: 'NG', name: 'Nigeria',        lat: 9.08,    lng: 8.67,    flag: '🇳🇬', newsApiCode: 'ng' },
  { code: 'MX', name: 'Mexico',         lat: 23.63,   lng: -102.55, flag: '🇲🇽', newsApiCode: 'mx' },
  { code: 'AR', name: 'Argentina',      lat: -38.41,  lng: -63.61,  flag: '🇦🇷', newsApiCode: 'ar' },
  { code: 'EG', name: 'Egypt',          lat: 26.82,   lng: 30.80,   flag: '🇪🇬', newsApiCode: 'eg' },
  { code: 'IL', name: 'Israel',         lat: 31.04,   lng: 34.85,   flag: '🇮🇱', newsApiCode: 'il' },
  { code: 'SA', name: 'Saudi Arabia',   lat: 23.88,   lng: 45.07,   flag: '🇸🇦', newsApiCode: 'sa' },
  { code: 'PK', name: 'Pakistan',       lat: 30.37,   lng: 69.34,   flag: '🇵🇰', newsApiCode: 'pk' },
  { code: 'KR', name: 'South Korea',    lat: 35.90,   lng: 127.76,  flag: '🇰🇷', newsApiCode: 'kr' },
  { code: 'IT', name: 'Italy',          lat: 41.87,   lng: 12.56,   flag: '🇮🇹', newsApiCode: 'it' },
  { code: 'UA', name: 'Ukraine',        lat: 48.37,   lng: 31.16,   flag: '🇺🇦', newsApiCode: 'ua' },
  { code: 'TR', name: 'Turkey',         lat: 38.96,   lng: 35.24,   flag: '🇹🇷', newsApiCode: 'tr' },
  { code: 'ID', name: 'Indonesia',      lat: -0.78,   lng: 113.92,  flag: '🇮🇩', newsApiCode: 'id' },
  { code: 'NL', name: 'Netherlands',    lat: 52.13,   lng: 5.29,    flag: '🇳🇱', newsApiCode: 'nl' },
  // ── Expanded 25 ──
  { code: 'ES', name: 'Spain',          lat: 40.46,   lng: -3.74,   flag: '🇪🇸', newsApiCode: 'es' },
  { code: 'SE', name: 'Sweden',         lat: 60.12,   lng: 18.64,   flag: '🇸🇪', newsApiCode: 'se' },
  { code: 'NO', name: 'Norway',         lat: 60.47,   lng: 8.46,    flag: '🇳🇴', newsApiCode: 'no' },
  { code: 'PL', name: 'Poland',         lat: 51.91,   lng: 19.14,   flag: '🇵🇱', newsApiCode: 'pl' },
  { code: 'CH', name: 'Switzerland',    lat: 46.81,   lng: 8.22,    flag: '🇨🇭', newsApiCode: 'ch' },
  { code: 'BE', name: 'Belgium',        lat: 50.50,   lng: 4.46,    flag: '🇧🇪', newsApiCode: 'be' },
  { code: 'PT', name: 'Portugal',       lat: 39.39,   lng: -8.22,   flag: '🇵🇹', newsApiCode: 'pt' },
  { code: 'GR', name: 'Greece',         lat: 39.07,   lng: 21.82,   flag: '🇬🇷', newsApiCode: 'gr' },
  { code: 'AE', name: 'UAE',            lat: 23.42,   lng: 53.84,   flag: '🇦🇪', newsApiCode: 'ae' },
  { code: 'IR', name: 'Iran',           lat: 32.42,   lng: 53.68,   flag: '🇮🇷', newsApiCode: 'ir' },
  { code: 'IQ', name: 'Iraq',           lat: 33.22,   lng: 43.67,   flag: '🇮🇶', newsApiCode: 'iq' },
  { code: 'SG', name: 'Singapore',      lat: 1.35,    lng: 103.81,  flag: '🇸🇬', newsApiCode: 'sg' },
  { code: 'MY', name: 'Malaysia',       lat: 4.21,    lng: 101.97,  flag: '🇲🇾', newsApiCode: 'my' },
  { code: 'TH', name: 'Thailand',       lat: 15.87,   lng: 100.99,  flag: '🇹🇭', newsApiCode: 'th' },
  { code: 'PH', name: 'Philippines',    lat: 12.87,   lng: 121.77,  flag: '🇵🇭', newsApiCode: 'ph' },
  { code: 'VN', name: 'Vietnam',        lat: 14.05,   lng: 108.27,  flag: '🇻🇳', newsApiCode: 'vn' },
  { code: 'BD', name: 'Bangladesh',     lat: 23.68,   lng: 90.35,   flag: '🇧🇩', newsApiCode: 'bd' },
  { code: 'KE', name: 'Kenya',          lat: -0.02,   lng: 37.90,   flag: '🇰🇪', newsApiCode: 'ke' },
  { code: 'ET', name: 'Ethiopia',       lat: 9.14,    lng: 40.48,   flag: '🇪🇹', newsApiCode: 'et' },
  { code: 'GH', name: 'Ghana',          lat: 7.95,    lng: -1.02,   flag: '🇬🇭', newsApiCode: 'gh' },
  { code: 'CO', name: 'Colombia',       lat: 4.57,    lng: -74.29,  flag: '🇨🇴', newsApiCode: 'co' },
  { code: 'CL', name: 'Chile',          lat: -35.67,  lng: -71.54,  flag: '🇨🇱', newsApiCode: 'cl' },
  { code: 'AT', name: 'Austria',        lat: 47.51,   lng: 14.55,   flag: '🇦🇹', newsApiCode: 'at' },
  { code: 'CZ', name: 'Czech Republic', lat: 49.81,   lng: 15.47,   flag: '🇨🇿', newsApiCode: 'cz' },
  { code: 'HU', name: 'Hungary',        lat: 47.16,   lng: 19.50,   flag: '🇭🇺', newsApiCode: 'hu' },

  // ── Oceania ──
  { code: 'NZ', name: 'New Zealand',    lat: -40.90,  lng: 174.89,  flag: '🇳🇿', newsApiCode: 'nz' },
  { code: 'PG', name: 'Papua New Guinea', lat: -6.31, lng: 143.96,  flag: '🇵🇬', newsApiCode: 'pg' },

  // ── Europe ──
  { code: 'IE', name: 'Ireland',        lat: 53.41,   lng: -8.24,   flag: '🇮🇪', newsApiCode: 'ie' },
  { code: 'DK', name: 'Denmark',        lat: 56.26,   lng: 9.50,    flag: '🇩🇰', newsApiCode: 'dk' },
  { code: 'FI', name: 'Finland',        lat: 61.92,   lng: 25.75,   flag: '🇫🇮', newsApiCode: 'fi' },
  { code: 'RO', name: 'Romania',        lat: 45.94,   lng: 24.97,   flag: '🇷🇴', newsApiCode: 'ro' },
  { code: 'BG', name: 'Bulgaria',       lat: 42.73,   lng: 25.49,   flag: '🇧🇬', newsApiCode: 'bg' },
  { code: 'HR', name: 'Croatia',        lat: 45.10,   lng: 15.20,   flag: '🇭🇷', newsApiCode: 'hr' },
  { code: 'RS', name: 'Serbia',         lat: 44.02,   lng: 21.01,   flag: '🇷🇸', newsApiCode: 'rs' },
  { code: 'SK', name: 'Slovakia',       lat: 48.67,   lng: 19.70,   flag: '🇸🇰', newsApiCode: 'sk' },
  { code: 'SI', name: 'Slovenia',       lat: 46.15,   lng: 14.99,   flag: '🇸🇮', newsApiCode: 'si' },
  { code: 'LT', name: 'Lithuania',      lat: 55.17,   lng: 23.88,   flag: '🇱🇹', newsApiCode: 'lt' },
  { code: 'EE', name: 'Estonia',        lat: 58.60,   lng: 25.01,   flag: '🇪🇪', newsApiCode: 'ee' },
  { code: 'IS', name: 'Iceland',        lat: 64.96,   lng: -19.02,  flag: '🇮🇸', newsApiCode: 'is' },
  { code: 'BY', name: 'Belarus',        lat: 53.71,   lng: 27.95,   flag: '🇧🇾', newsApiCode: 'by' },

  // ── Asia ──
  { code: 'TW', name: 'Taiwan',         lat: 23.70,   lng: 120.96,  flag: '🇹🇼', newsApiCode: 'tw' },
  { code: 'HK', name: 'Hong Kong',      lat: 22.32,   lng: 114.17,  flag: '🇭🇰', newsApiCode: 'hk' },
  { code: 'NP', name: 'Nepal',          lat: 28.39,   lng: 84.12,   flag: '🇳🇵', newsApiCode: 'np' },
  { code: 'LK', name: 'Sri Lanka',      lat: 7.87,    lng: 80.77,   flag: '🇱🇰', newsApiCode: 'lk' },
  { code: 'MM', name: 'Myanmar',        lat: 21.91,   lng: 95.96,   flag: '🇲🇲', newsApiCode: 'mm' },
  { code: 'KH', name: 'Cambodia',       lat: 12.57,   lng: 104.99,  flag: '🇰🇭', newsApiCode: 'kh' },
  { code: 'MN', name: 'Mongolia',       lat: 46.86,   lng: 103.85,  flag: '🇲🇳', newsApiCode: 'mn' },
  { code: 'KZ', name: 'Kazakhstan',     lat: 48.02,   lng: 66.92,   flag: '🇰🇿', newsApiCode: 'kz' },
  { code: 'UZ', name: 'Uzbekistan',     lat: 41.38,   lng: 64.59,   flag: '🇺🇿', newsApiCode: 'uz' },
  { code: 'AF', name: 'Afghanistan',    lat: 33.94,   lng: 67.71,   flag: '🇦🇫', newsApiCode: 'af' },
  { code: 'AZ', name: 'Azerbaijan',     lat: 40.14,   lng: 47.58,   flag: '🇦🇿', newsApiCode: 'az' },
  { code: 'GE', name: 'Georgia',        lat: 42.32,   lng: 43.36,   flag: '🇬🇪', newsApiCode: 'ge' },
  { code: 'AM', name: 'Armenia',        lat: 40.07,   lng: 45.04,   flag: '🇦🇲', newsApiCode: 'am' },
  { code: 'KP', name: 'North Korea',    lat: 40.34,   lng: 127.51,  flag: '🇰🇵', newsApiCode: 'kp' },

  // ── Middle East ──
  { code: 'QA', name: 'Qatar',          lat: 25.35,   lng: 51.18,   flag: '🇶🇦', newsApiCode: 'qa' },
  { code: 'KW', name: 'Kuwait',         lat: 29.31,   lng: 47.48,   flag: '🇰🇼', newsApiCode: 'kw' },
  { code: 'OM', name: 'Oman',           lat: 21.51,   lng: 55.92,   flag: '🇴🇲', newsApiCode: 'om' },
  { code: 'JO', name: 'Jordan',         lat: 30.59,   lng: 36.24,   flag: '🇯🇴', newsApiCode: 'jo' },
  { code: 'LB', name: 'Lebanon',        lat: 33.85,   lng: 35.86,   flag: '🇱🇧', newsApiCode: 'lb' },
  { code: 'SY', name: 'Syria',          lat: 34.80,   lng: 39.00,   flag: '🇸🇾', newsApiCode: 'sy' },
  { code: 'YE', name: 'Yemen',          lat: 15.55,   lng: 48.52,   flag: '🇾🇪', newsApiCode: 'ye' },

  // ── Africa ──
  { code: 'MA', name: 'Morocco',        lat: 31.79,   lng: -7.09,   flag: '🇲🇦', newsApiCode: 'ma' },
  { code: 'DZ', name: 'Algeria',        lat: 28.03,   lng: 1.66,    flag: '🇩🇿', newsApiCode: 'dz' },
  { code: 'TN', name: 'Tunisia',        lat: 33.89,   lng: 9.54,    flag: '🇹🇳', newsApiCode: 'tn' },
  { code: 'LY', name: 'Libya',          lat: 26.34,   lng: 17.23,   flag: '🇱🇾', newsApiCode: 'ly' },
  { code: 'SD', name: 'Sudan',          lat: 12.86,   lng: 30.22,   flag: '🇸🇩', newsApiCode: 'sd' },
  { code: 'TZ', name: 'Tanzania',       lat: -6.37,   lng: 34.89,   flag: '🇹🇿', newsApiCode: 'tz' },
  { code: 'UG', name: 'Uganda',         lat: 1.37,    lng: 32.29,   flag: '🇺🇬', newsApiCode: 'ug' },
  { code: 'ZW', name: 'Zimbabwe',       lat: -19.02,  lng: 29.15,   flag: '🇿🇼', newsApiCode: 'zw' },
  { code: 'CD', name: 'DR Congo',       lat: -4.04,   lng: 21.76,   flag: '🇨🇩', newsApiCode: 'cd' },

  // ── Americas ──
  { code: 'PE', name: 'Peru',           lat: -9.19,   lng: -75.02,  flag: '🇵🇪', newsApiCode: 'pe' },
  { code: 'VE', name: 'Venezuela',      lat: 6.42,    lng: -66.59,  flag: '🇻🇪', newsApiCode: 've' },
  { code: 'EC', name: 'Ecuador',        lat: -1.83,   lng: -78.18,  flag: '🇪🇨', newsApiCode: 'ec' },
  { code: 'BO', name: 'Bolivia',        lat: -16.29,  lng: -63.59,  flag: '🇧🇴', newsApiCode: 'bo' },
  { code: 'UY', name: 'Uruguay',        lat: -32.52,  lng: -55.77,  flag: '🇺🇾', newsApiCode: 'uy' },
]

export function getCountryByCode(code: string): CountryMeta | undefined {
  return COUNTRIES.find(c => c.code === code)
}

/**
 * Per-country map zoom for the country page backdrop, so a large landmass and a
 * city-state both frame nicely. Anything unlisted falls back to DEFAULT_ZOOM.
 */
const DEFAULT_ZOOM = 5

const COUNTRY_ZOOM: Record<string, number> = {
  RU: 3, CA: 3, US: 4, CN: 4, BR: 4, AU: 4, IN: 4,
  AR: 4, KZ: 4, ID: 4, MX: 5, ZA: 5, NG: 5, EG: 5,
  SA: 5, IR: 5, TR: 5, UA: 5, FR: 5, ES: 5, DE: 5,
  JP: 5, PK: 5, ET: 5, CL: 4, CO: 5, KE: 5, TH: 5,
  VN: 5, MY: 5, PH: 5, IT: 5, PL: 5, SE: 4, NO: 4,
  GB: 5, IQ: 6, GR: 6, BD: 6, GH: 6, CZ: 6,
  HU: 6, PT: 6, AT: 6, KR: 6, NL: 7, BE: 7, CH: 7,
  IL: 7, AE: 7, SG: 10,

  // Added with the 100-country expansion
  DZ: 4, LY: 4, SD: 4, CD: 4, MN: 4, PE: 5, BO: 5, VE: 5,
  NZ: 5, AF: 5, MM: 5, MA: 5, TZ: 5, UZ: 5, PG: 5, FI: 5,
  IS: 5, BY: 5, RO: 6, BG: 6, RS: 6, UG: 6, ZW: 6, EC: 6,
  UY: 6, PY: 6, SY: 6, YE: 6, OM: 6, JO: 6, TN: 6, KH: 6,
  NP: 6, LK: 6, IE: 6, DK: 6, HR: 6, SK: 6, LT: 6, EE: 6,
  AZ: 6, GE: 6, AM: 7, KP: 6, TW: 7, SI: 7, LB: 8, KW: 8,
  QA: 8, HK: 10,
}

export function getCountryZoom(code: string): number {
  return COUNTRY_ZOOM[code.toUpperCase()] ?? DEFAULT_ZOOM
}
