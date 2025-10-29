import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Article, WordPressConfig, AIConfig } from '../types';
import { supabaseSchedulerService } from '../services/supabaseSchedulerService';
import { articlesService } from '../services/articlesService';

interface AppState {
  articles: Article[];
  wordPressConfigs: WordPressConfig[];
  aiConfig: AIConfig | null;
  activeView: string;
  isGenerating: boolean;
  isLoading: boolean;

  // Actions
  setActiveView: (view: string) => void;
  addArticle: (article: Article) => void;
  updateArticle: (id: string, updates: Partial<Article>) => void;
  deleteArticle: (id: string) => void;
  addWordPressConfig: (config: WordPressConfig) => void;
  updateWordPressConfig: (id: string, updates: Partial<WordPressConfig>) => void;
  deleteWordPressConfig: (id: string) => void;
  setAIConfig: (config: AIConfig) => void;
  setIsGenerating: (generating: boolean) => void;
  loadFromSupabase: () => Promise<void>;
  syncToSupabase: () => Promise<void>;
  loadArticlesFromSupabase: () => Promise<void>;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      articles: [],
      wordPressConfigs: [],
      aiConfig: null,
      activeView: 'dashboard',
      isGenerating: false,
      isLoading: false,

      setActiveView: (view) => {
        try {
          set({ activeView: view });
        } catch (error) {
          console.error('Error setting active view:', error);
        }
      },
      
      addArticle: (article) => {
        try {
          set((state) => {
            const exists = state.articles.some(a => a.id === article.id);
            if (exists) {
              return {
                articles: state.articles.map(a => a.id === article.id ? article : a)
              };
            }
            return { articles: [article, ...state.articles] };
          });
        } catch (error) {
          console.error('Error adding article:', error);
        }
      },
      
      updateArticle: async (id, updates) => {
        try {
          set((state) => ({
            articles: state.articles.map((article) =>
              article.id === id ? { ...article, ...updates } : article
            ),
          }));
          await articlesService.updateArticle(id, updates);
        } catch (error) {
          console.error('Error updating article:', error);
        }
      },
      
      deleteArticle: async (id) => {
        try {
          set((state) => ({
            articles: state.articles.filter((article) => article.id !== id),
          }));
          await articlesService.deleteArticle(id);
        } catch (error) {
          console.error('Error deleting article:', error);
        }
      },
      
      addWordPressConfig: async (config) => {
        try {
          set((state) => ({ wordPressConfigs: [...state.wordPressConfigs, config] }));
          await supabaseSchedulerService.saveWordPressConfig(config);
        } catch (error) {
          console.error('Error adding WordPress config:', error);
        }
      },
      
      updateWordPressConfig: async (id, updates) => {
        try {
          set((state) => ({
            wordPressConfigs: state.wordPressConfigs.map((config) =>
              config.id === id ? { ...config, ...updates } : config
            ),
          }));
          const updatedConfig = get().wordPressConfigs.find(c => c.id === id);
          if (updatedConfig) {
            await supabaseSchedulerService.saveWordPressConfig(updatedConfig);
          }
        } catch (error) {
          console.error('Error updating WordPress config:', error);
        }
      },
      
      deleteWordPressConfig: async (id) => {
        try {
          set((state) => ({
            wordPressConfigs: state.wordPressConfigs.filter((config) => config.id !== id),
          }));
          await supabaseSchedulerService.deleteWordPressConfig(id);
        } catch (error) {
          console.error('Error deleting WordPress config:', error);
        }
      },
      
      setAIConfig: async (config) => {
        try {
          set({ aiConfig: config });
          await supabaseSchedulerService.saveAIConfig(config);
        } catch (error) {
          console.error('Error setting AI config:', error);
        }
      },
      
      setIsGenerating: (generating) => {
        try {
          set({ isGenerating: generating });
        } catch (error) {
          console.error('Error setting generating state:', error);
        }
      },

      loadFromSupabase: async () => {
        try {
          set({ isLoading: true });
          const [wpConfigs, aiConfig, articles] = await Promise.all([
            supabaseSchedulerService.loadWordPressConfigs(),
            supabaseSchedulerService.loadAIConfig(),
            articlesService.getAllArticles()
          ]);
          set({
            wordPressConfigs: wpConfigs,
            aiConfig: aiConfig,
            articles: articles,
            isLoading: false
          });
        } catch (error) {
          console.error('Error loading from Supabase:', error);
          set({ isLoading: false });
        }
      },

      loadArticlesFromSupabase: async () => {
        try {
          const articles = await articlesService.getAllArticles();
          set({ articles });
        } catch (error) {
          console.error('Error loading articles from Supabase:', error);
        }
      },

      syncToSupabase: async () => {
        try {
          const { wordPressConfigs, aiConfig } = get();
          if (aiConfig) {
            await supabaseSchedulerService.saveAIConfig(aiConfig);
          }
          for (const config of wordPressConfigs) {
            await supabaseSchedulerService.saveWordPressConfig(config);
          }
        } catch (error) {
          console.error('Error syncing to Supabase:', error);
        }
      }
    }),
    {
      name: 'ai-wordpress-storage',
      onRehydrateStorage: () => (state) => {
        if (state) {
          console.log('Store rehydrated successfully');
        }
      },
    }
  )
);