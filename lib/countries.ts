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
]

export function getCountryByCode(code: string): CountryMeta | undefined {
  return COUNTRIES.find(c => c.code === code)
}
