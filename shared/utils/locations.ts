import type { LocationInfo } from '../types'

type Entry = [slug: string, name: string, flag: string, terms: string[], aliases?: string[]]

const REGIONS: Record<string, Entry[]> = {
  'Asia': [
    ['nepal', 'Nepal', '🇳🇵', ['Nepal', 'Kathmandu', 'Pokhara', 'Bhaktapur', 'Biratnagar']],
    ['india', 'India', '🇮🇳', ['India', 'Bangalore', 'Bengaluru', 'Mumbai', 'Delhi', 'Hyderabad'], ['pune', 'chennai', 'kolkata', 'noida', 'gurgaon', 'gurugram']],
    ['pakistan', 'Pakistan', '🇵🇰', ['Pakistan', 'Karachi', 'Lahore', 'Islamabad']],
    ['bangladesh', 'Bangladesh', '🇧🇩', ['Bangladesh', 'Dhaka', 'Chittagong']],
    ['sri-lanka', 'Sri Lanka', '🇱🇰', ['Sri Lanka', 'Colombo']],
    ['china', 'China', '🇨🇳', ['China', 'Beijing', 'Shanghai', 'Shenzhen', 'Hangzhou', 'Guangzhou'], ['中国', '北京', '上海', '深圳', '杭州']],
    ['japan', 'Japan', '🇯🇵', ['Japan', 'Tokyo', 'Osaka', 'Kyoto'], ['日本', '東京']],
    ['south-korea', 'South Korea', '🇰🇷', ['Korea', 'Seoul', 'Busan'], ['대한민국', '서울']],
    ['taiwan', 'Taiwan', '🇹🇼', ['Taiwan', 'Taipei'], ['台灣', '台北']],
    ['hong-kong', 'Hong Kong', '🇭🇰', ['Hong Kong'], ['香港']],
    ['singapore', 'Singapore', '🇸🇬', ['Singapore']],
    ['indonesia', 'Indonesia', '🇮🇩', ['Indonesia', 'Jakarta', 'Bandung', 'Yogyakarta']],
    ['vietnam', 'Vietnam', '🇻🇳', ['Vietnam', 'Hanoi', 'Ho Chi Minh'], ['viet nam', 'saigon']],
    ['philippines', 'Philippines', '🇵🇭', ['Philippines', 'Manila', 'Cebu']],
    ['thailand', 'Thailand', '🇹🇭', ['Thailand', 'Bangkok']],
    ['malaysia', 'Malaysia', '🇲🇾', ['Malaysia', 'Kuala Lumpur']],
    ['uae', 'United Arab Emirates', '🇦🇪', ['UAE', 'United Arab Emirates', 'Dubai', 'Abu Dhabi']],
    ['saudi-arabia', 'Saudi Arabia', '🇸🇦', ['Saudi Arabia', 'Riyadh', 'Jeddah'], ['ksa']],
    ['israel', 'Israel', '🇮🇱', ['Israel', 'Tel Aviv', 'Jerusalem']],
    ['turkey', 'Türkiye', '🇹🇷', ['Turkey', 'Türkiye', 'Istanbul', 'Ankara']],
    ['iran', 'Iran', '🇮🇷', ['Iran', 'Tehran']],
  ],
  'Europe': [
    ['united-kingdom', 'United Kingdom', '🇬🇧', ['United Kingdom', 'UK', 'England', 'London', 'Manchester', 'Scotland'], ['wales', 'edinburgh', 'cambridge', 'oxford', 'bristol']],
    ['germany', 'Germany', '🇩🇪', ['Germany', 'Deutschland', 'Berlin', 'Munich', 'Hamburg'], ['münchen', 'cologne', 'köln', 'frankfurt']],
    ['france', 'France', '🇫🇷', ['France', 'Paris', 'Lyon']],
    ['netherlands', 'Netherlands', '🇳🇱', ['Netherlands', 'Amsterdam', 'Rotterdam'], ['the hague', 'utrecht', 'nederland']],
    ['spain', 'Spain', '🇪🇸', ['Spain', 'España', 'Madrid', 'Barcelona']],
    ['italy', 'Italy', '🇮🇹', ['Italy', 'Italia', 'Milan', 'Rome'], ['milano', 'roma', 'turin', 'torino']],
    ['portugal', 'Portugal', '🇵🇹', ['Portugal', 'Lisbon', 'Porto'], ['lisboa']],
    ['poland', 'Poland', '🇵🇱', ['Poland', 'Polska', 'Warsaw', 'Kraków', 'Wrocław'], ['krakow', 'wroclaw', 'warszawa']],
    ['sweden', 'Sweden', '🇸🇪', ['Sweden', 'Stockholm'], ['sverige', 'gothenburg']],
    ['norway', 'Norway', '🇳🇴', ['Norway', 'Oslo']],
    ['denmark', 'Denmark', '🇩🇰', ['Denmark', 'Copenhagen']],
    ['finland', 'Finland', '🇫🇮', ['Finland', 'Helsinki']],
    ['switzerland', 'Switzerland', '🇨🇭', ['Switzerland', 'Zurich', 'Geneva'], ['zürich', 'schweiz', 'suisse']],
    ['austria', 'Austria', '🇦🇹', ['Austria', 'Vienna'], ['wien', 'österreich']],
    ['belgium', 'Belgium', '🇧🇪', ['Belgium', 'Brussels']],
    ['ireland', 'Ireland', '🇮🇪', ['Ireland', 'Dublin']],
    ['czechia', 'Czechia', '🇨🇿', ['Czech', 'Czechia', 'Prague', 'Brno']],
    ['ukraine', 'Ukraine', '🇺🇦', ['Ukraine', 'Kyiv', 'Kiev', 'Lviv', 'Kharkiv']],
    ['russia', 'Russia', '🇷🇺', ['Russia', 'Moscow', 'Saint Petersburg'], ['россия', 'москва']],
    ['romania', 'Romania', '🇷🇴', ['Romania', 'Bucharest', 'Cluj']],
    ['greece', 'Greece', '🇬🇷', ['Greece', 'Athens']],
  ],
  'Americas': [
    ['united-states', 'United States', '🇺🇸', ['United States', 'USA', 'San Francisco', 'New York', 'Seattle', 'California'], ['us', 'u.s.', 'nyc', 'bay area', 'los angeles', 'boston', 'austin', 'chicago', 'texas', 'washington', 'portland', 'denver']],
    ['canada', 'Canada', '🇨🇦', ['Canada', 'Toronto', 'Vancouver', 'Montreal'], ['montréal', 'ottawa', 'waterloo']],
    ['mexico', 'Mexico', '🇲🇽', ['Mexico', 'México', 'CDMX', 'Guadalajara']],
    ['brazil', 'Brazil', '🇧🇷', ['Brazil', 'Brasil', 'São Paulo', 'Rio de Janeiro'], ['sao paulo']],
    ['argentina', 'Argentina', '🇦🇷', ['Argentina', 'Buenos Aires']],
    ['colombia', 'Colombia', '🇨🇴', ['Colombia', 'Bogotá', 'Medellín'], ['bogota', 'medellin']],
    ['chile', 'Chile', '🇨🇱', ['Chile', 'Santiago']],
    ['peru', 'Peru', '🇵🇪', ['Peru', 'Lima'], ['perú']],
  ],
  'Africa': [
    ['nigeria', 'Nigeria', '🇳🇬', ['Nigeria', 'Lagos', 'Abuja']],
    ['kenya', 'Kenya', '🇰🇪', ['Kenya', 'Nairobi']],
    ['egypt', 'Egypt', '🇪🇬', ['Egypt', 'Cairo']],
    ['south-africa', 'South Africa', '🇿🇦', ['South Africa', 'Cape Town', 'Johannesburg']],
    ['ghana', 'Ghana', '🇬🇭', ['Ghana', 'Accra']],
    ['morocco', 'Morocco', '🇲🇦', ['Morocco', 'Casablanca', 'Rabat']],
    ['ethiopia', 'Ethiopia', '🇪🇹', ['Ethiopia', 'Addis Ababa']],
  ],
  'Oceania': [
    ['australia', 'Australia', '🇦🇺', ['Australia', 'Sydney', 'Melbourne', 'Brisbane'], ['perth', 'adelaide', 'canberra']],
    ['new-zealand', 'New Zealand', '🇳🇿', ['New Zealand', 'Auckland', 'Wellington']],
  ],
}

export const GLOBAL_LOCATION: LocationInfo = {
  slug: 'global',
  name: 'Global',
  flag: '🌍',
  region: 'World',
  terms: [],
}

export const LOCATIONS: LocationInfo[] = Object.entries(REGIONS).flatMap(([region, entries]) =>
  entries.map(([slug, name, flag, terms, aliases]) => ({ slug, name, flag, region, terms, aliases })),
)

export const LOCATION_REGIONS = Object.keys(REGIONS)

/** Shown on the home page and kept warm by the cron task */
export const FEATURED_SLUGS = [
  'global',
  'nepal',
  'india',
  'united-states',
  'germany',
  'china',
  'united-kingdom',
  'brazil',
  'japan',
  'canada',
  'nigeria',
  'indonesia',
]

const bySlug = new Map(LOCATIONS.map(l => [l.slug, l]))

const CUSTOM_SLUG = /^[a-z][a-z-]{1,38}[a-z]$/

/** Known slugs resolve to curated locations; any other simple slug becomes a free-text location. */
export function resolveLocation(slug: string): LocationInfo | null {
  const key = slug.toLowerCase()
  if (key === 'global') return GLOBAL_LOCATION
  const known = bySlug.get(key)
  if (known) return known
  if (!CUSTOM_SLUG.test(key) || key.includes('--')) return null
  const name = key
    .split('-')
    .map(w => w[0]!.toUpperCase() + w.slice(1))
    .join(' ')
  return { slug: key, name, flag: '📍', region: 'Custom', terms: [name] }
}

export function slugifyLocation(input: string) {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

/**
 * A location naming this many curated places is keyword stuffing ("uk usa india nepal ..."),
 * written to show up in every country's search. People who list where they've lived name
 * at most five.
 */
const STUFFED_AT = 6

let matchers: { loc: LocationInfo; re: RegExp }[] | undefined

function locationMatchers() {
  return (matchers ??= LOCATIONS.map(loc => {
    const words = [...loc.terms, ...(loc.aliases ?? [])].map(w =>
      w.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
    )
    return { loc, re: new RegExp(`(?:^|[^\\p{L}])(?:${words.join('|')})(?:$|[^\\p{L}])`, 'iu') }
  }))
}

/** Whether a location is keyword stuffing; such developers rank on no location's board. */
export function isStuffedLocation(text: string | null | undefined) {
  // Most locations are a few words long, too short to name that many places.
  if (!text || (text.match(/\p{L}+/gu)?.length ?? 0) < STUFFED_AT) return false
  return locationMatchers().filter(m => m.re.test(text)).length >= STUFFED_AT
}

/**
 * Map a profile's free-text location ("Kathmandu, Nepal") to a curated location.
 * Segments are checked right to left, since the country usually comes last
 * ("New South Wales, Australia" is Australia, not Wales).
 */
export function matchLocation(text: string | null | undefined): LocationInfo | null {
  if (!text || isStuffedLocation(text)) return null
  const segments = text.split(/[,|/·;]/).reverse()
  for (const segment of segments) {
    const hit = locationMatchers().find(m => m.re.test(segment))
    if (hit) return hit.loc
  }
  return null
}
