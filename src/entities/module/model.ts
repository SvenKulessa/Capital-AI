export interface CoreModule {
  id: string;
  title: string;
  description: string;
  iconType: 'brain' | 'leaf' | 'book' | 'news' | 'screener' | 'builder';
  tagline: string;
  brandColor?: string;
  accentColor?: string;
  details: {
    features: string[];
    useCase: string;
    sampleMetrics: { label: string; value: string; score?: string }[];
    newsItems?: {
      headline: string;
      source: string;
      time: string;
      sentiment: 'bullish' | 'bearish' | 'neutral';
      impact: string;
    }[];
  };
}
