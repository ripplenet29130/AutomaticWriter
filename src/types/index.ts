export interface Article {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  keywords: string[];
  category: string;
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  tone?: 'professional' | 'casual' | 'technical' | 'friendly';
  length?: 'short' | 'medium' | 'long';
  aiProvider?: string;
  aiModel?: string;
  scheduledAt?: Date | string;
  publishedAt?: Date | string;
  generatedAt?: Date | string;
  updatedAt?: Date | string;
  createdAt?: Date | string;
  wordPressPostId?: string;
  wordPressConfigId?: string;
  wordPressId?: number;
  seoScore?: number;
  readingTime?: number;
  wordCount?: number;
  trendData?: TrendAnalysisResult | any;
}

export interface WordPressConfig {
  id: string;
  name: string;
  url: string;
  username: string;
  applicationPassword: string;
  isActive: boolean;
  defaultCategory?: string;
  category?: string;
  scheduleSettings?: ScheduleSettings;
}

export interface AIConfig {
  provider: 'openai' | 'claude' | 'gemini';
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  imageGenerationEnabled?: boolean;
  imageProvider?: 'dalle3' | 'midjourney' | 'stable-diffusion';
}

export interface ArticleTopic {
  id: string;
  name: string;
  description: string;
  category: string;
  defaultKeywords: string[];
  icon: string;
}

export interface GenerationPrompt {
  topicId?: string;
  topic: string;
  keywords: string[];
  tone: 'professional' | 'casual' | 'technical' | 'friendly';
  length: 'short' | 'medium' | 'long';
  includeIntroduction: boolean;
  includeConclusion: boolean;
  includeSources: boolean;
  generateImages?: boolean;
  useTrendData?: boolean;
  trendAnalysis?: TrendAnalysisResult;
  trendData?: TrendAnalysisResult;
  selectedTitleSuggestion?: TitleSuggestion;
}

export interface ScheduleSettings {
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  time: string;
  daysOfWeek?: number[];
  timezone: string;
  isActive: boolean;
  targetKeywords: string[];
  publishStatus: 'publish' | 'draft';
  titleGenerationCount?: number;
}

export interface TitleSuggestion {
  id: string;
  title: string;
  keyword: string;
  description: string;
  trendScore: number;
  searchVolume: number;
  competition: 'low' | 'medium' | 'high';
  seoScore: number;
  clickPotential: number;
  targetAudience: string;
  contentAngle: string;
  relatedKeywords: string[];
  trendAnalysis?: TrendAnalysisResult;
}

export interface TrendTopic {
  id: string;
  keyword: string;
  name: string;
  description: string;
  trendScore: number;
  searchVolume: number;
  competition: 'low' | 'medium' | 'high';
  type: 'main' | 'related' | 'suggestion';
  relatedKeywords?: string[];
  seoData?: {
    difficulty: number;
    opportunity: number;
  };
}

export interface TrendAnalysisResult {
  keyword: string;
  trendScore: number;
  searchVolume: number;
  competition: 'low' | 'medium' | 'high';
  relatedKeywords: string[];
  hotTopics: string[];
  seoData: {
    difficulty: number;
    opportunity: number;
    suggestions: string[];
  };
  competitorAnalysis: {
    topArticles: CompetitorArticle[];
    averageLength: number;
    commonTopics: string[];
  };
  userInterest: {
    risingQueries: string[];
    breakoutQueries: string[];
    geographicData: GeographicTrend[];
  };
  timestamp: Date;
}

export interface CompetitorArticle {
  title: string;
  url: string;
  domain: string;
  wordCount: number;
  headings: string[];
  metaDescription: string;
  publishDate?: Date;
}

export interface GeographicTrend {
  region: string;
  value: number;
  formattedValue: string;
}

export interface KeywordSuggestion {
  keyword: string;
  searchVolume: number;
  competition: 'low' | 'medium' | 'high';
  cpc: number;
  trend: 'rising' | 'stable' | 'declining';
}

export interface TrendConfig {
  enableTrendAnalysis: boolean;
  updateFrequency: 'hourly' | 'daily' | 'weekly';
  regions: string[];
  languages: string[];
  competitorDomains: string[];
}