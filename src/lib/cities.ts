export interface CityConfig {
  name: string;
  geonameid: number;
  lat: number;
  lng: number;
  tz: string;
  country: string;
  candleOffset: number;
}

export const CITIES: Record<string, CityConfig> = {
  '2988507': { name: 'Paris', geonameid: 2988507, lat: 48.8566, lng: 2.3522, tz: 'Europe/Paris', country: 'FR', candleOffset: 18 },
  '2995469': { name: 'Marseille', geonameid: 2995469, lat: 43.2965, lng: 5.3698, tz: 'Europe/Paris', country: 'FR', candleOffset: 20 },
  '2996944': { name: 'Lyon', geonameid: 2996944, lat: 45.7640, lng: 4.8357, tz: 'Europe/Paris', country: 'FR', candleOffset: 18 },
  '2990440': { name: 'Nice', geonameid: 2990440, lat: 43.7102, lng: 7.2620, tz: 'Europe/Paris', country: 'FR', candleOffset: 18 },
  '3031582': { name: 'Bordeaux', geonameid: 3031582, lat: 44.8378, lng: -0.5792, tz: 'Europe/Paris', country: 'FR', candleOffset: 18 },
  '6455259': { name: 'Créteil', geonameid: 6455259, lat: 48.7904, lng: 2.4614, tz: 'Europe/Paris', country: 'FR', candleOffset: 18 },
  '3021372': { name: 'Strasbourg', geonameid: 3021372, lat: 48.5734, lng: 7.7521, tz: 'Europe/Paris', country: 'FR', candleOffset: 18 },
  '2972315': { name: 'Toulouse', geonameid: 2972315, lat: 43.6047, lng: 1.4442, tz: 'Europe/Paris', country: 'FR', candleOffset: 18 },
  '281184': { name: 'Jérusalem', geonameid: 281184, lat: 31.7683, lng: 35.2137, tz: 'Asia/Jerusalem', country: 'IL', candleOffset: 40 },
  '293397': { name: 'Tel Aviv', geonameid: 293397, lat: 32.0853, lng: 34.7818, tz: 'Asia/Jerusalem', country: 'IL', candleOffset: 18 },
  '294801': { name: 'Haïfa', geonameid: 294801, lat: 32.7940, lng: 34.9896, tz: 'Asia/Jerusalem', country: 'IL', candleOffset: 30 },
  '295629': { name: 'Beer Sheva', geonameid: 295629, lat: 31.2518, lng: 34.7913, tz: 'Asia/Jerusalem', country: 'IL', candleOffset: 18 },
  '293100': { name: 'Netanya', geonameid: 293100, lat: 32.3215, lng: 34.8532, tz: 'Asia/Jerusalem', country: 'IL', candleOffset: 18 },
  '5128581': { name: 'New York', geonameid: 5128581, lat: 40.7128, lng: -74.0060, tz: 'America/New_York', country: 'US', candleOffset: 18 },
  '4699066': { name: 'Houston', geonameid: 4699066, lat: 29.7604, lng: -95.3698, tz: 'America/Chicago', country: 'US', candleOffset: 18 },
  '5368361': { name: 'Los Angeles', geonameid: 5368361, lat: 34.0522, lng: -118.2437, tz: 'America/Los_Angeles', country: 'US', candleOffset: 18 },
  '4164138': { name: 'Miami', geonameid: 4164138, lat: 25.7617, lng: -80.1918, tz: 'America/New_York', country: 'US', candleOffset: 18 },
  '2643743': { name: 'Londres', geonameid: 2643743, lat: 51.5074, lng: -0.1278, tz: 'Europe/London', country: 'GB', candleOffset: 18 },
  '6167865': { name: 'Toronto', geonameid: 6167865, lat: 43.6532, lng: -79.3832, tz: 'America/Toronto', country: 'CA', candleOffset: 18 },
  '3169070': { name: 'Rome', geonameid: 3169070, lat: 41.9028, lng: 12.4964, tz: 'Europe/Rome', country: 'IT', candleOffset: 18 },
  '2950159': { name: 'Berlin', geonameid: 2950159, lat: 52.5200, lng: 13.4050, tz: 'Europe/Berlin', country: 'DE', candleOffset: 18 },
  '2800866': { name: 'Bruxelles', geonameid: 2800866, lat: 50.8503, lng: 4.3517, tz: 'Europe/Brussels', country: 'BE', candleOffset: 18 },
  '2660646': { name: 'Genève', geonameid: 2660646, lat: 46.2044, lng: 6.1432, tz: 'Europe/Zurich', country: 'CH', candleOffset: 18 },
  '2759794': { name: 'Amsterdam', geonameid: 2759794, lat: 52.3676, lng: 4.9041, tz: 'Europe/Amsterdam', country: 'NL', candleOffset: 18 },
  '3117735': { name: 'Madrid', geonameid: 3117735, lat: 40.4168, lng: -3.7038, tz: 'Europe/Madrid', country: 'ES', candleOffset: 18 },
  '2761369': { name: 'Vienne', geonameid: 2761369, lat: 48.2082, lng: 16.3738, tz: 'Europe/Vienna', country: 'AT', candleOffset: 18 },
  '524901': { name: 'Moscou', geonameid: 524901, lat: 55.7558, lng: 37.6173, tz: 'Europe/Moscow', country: 'RU', candleOffset: 18 },
  '993800': { name: 'Johannesburg', geonameid: 993800, lat: -26.2041, lng: 28.0473, tz: 'Africa/Johannesburg', country: 'ZA', candleOffset: 18 },
  '3435910': { name: 'Buenos Aires', geonameid: 3435910, lat: -34.6037, lng: -58.3816, tz: 'America/Argentina/Buenos_Aires', country: 'AR', candleOffset: 18 },
  '292223': { name: 'Dubaï', geonameid: 292223, lat: 25.2048, lng: 55.2708, tz: 'Asia/Dubai', country: 'AE', candleOffset: 18 },
};

export const DEFAULT_CITY = '2988507'; // Paris
