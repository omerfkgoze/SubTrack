export interface PopularService {
  name: string;
  defaultCategory?: string;
}

const POPULAR_SERVICES: PopularService[] = [
  { name: 'Netflix', defaultCategory: 'entertainment' },
  { name: 'Spotify', defaultCategory: 'music' },
  { name: 'Disney+', defaultCategory: 'entertainment' },
  { name: 'YouTube Premium', defaultCategory: 'entertainment' },
  { name: 'Apple Music', defaultCategory: 'music' },
  { name: 'iCloud', defaultCategory: 'cloud' },
  { name: 'Google One', defaultCategory: 'cloud' },
  { name: 'Adobe Creative Cloud', defaultCategory: 'productivity' },
  { name: 'Canva Pro', defaultCategory: 'productivity' },
  { name: 'Amazon Prime', defaultCategory: 'entertainment' },
  { name: 'HBO Max', defaultCategory: 'entertainment' },
  { name: 'Hulu', defaultCategory: 'entertainment' },
  { name: 'Paramount+', defaultCategory: 'entertainment' },
  { name: 'Crunchyroll', defaultCategory: 'entertainment' },
  { name: 'Xbox Game Pass', defaultCategory: 'gaming' },
  { name: 'PlayStation Plus', defaultCategory: 'gaming' },
  { name: 'Nintendo Switch Online', defaultCategory: 'gaming' },
  { name: 'Dropbox', defaultCategory: 'cloud' },
  { name: 'Microsoft 365', defaultCategory: 'productivity' },
  { name: 'LinkedIn Premium', defaultCategory: 'productivity' },
  { name: 'Headspace', defaultCategory: 'fitness' },
  { name: 'Calm', defaultCategory: 'fitness' },
  { name: 'Strava', defaultCategory: 'fitness' },
  { name: 'Duolingo', defaultCategory: 'productivity' },
  { name: 'ChatGPT Plus', defaultCategory: 'productivity' },
  { name: 'GitHub Copilot', defaultCategory: 'productivity' },
  { name: 'Notion', defaultCategory: 'productivity' },
  { name: 'Figma', defaultCategory: 'productivity' },
  { name: 'Slack', defaultCategory: 'productivity' },
  { name: 'Zoom', defaultCategory: 'productivity' },
];

export function searchPopularServices(query: string): PopularService[] {
  if (!query || query.length < 2) return [];

  const lowerQuery = query.toLowerCase();
  return POPULAR_SERVICES.filter((service) =>
    service.name.toLowerCase().startsWith(lowerQuery),
  );
}
