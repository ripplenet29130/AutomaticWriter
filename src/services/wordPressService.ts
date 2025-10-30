import axios from 'axios';
import { Article, ScheduleSettings } from '../types';
import { supabase } from './supabaseClient';

export interface WordPressConfig {
  id: string;
  name: string;
  url: string;
  username: string;
  applicationPassword: string;
  isActive: boolean;
  defaultCategory?: string;
  scheduleSettings?: ScheduleSettings;
}

export class WordPressService {
  private config: WordPressConfig | null = null;

constructor() {}


  async loadActiveConfig(): Promise<void> {
    const { data, error } = await supabase
      .from("wordpress_configs")
      .select("*")
      .eq("is_active", true)
      .single();

    if (error || !data) {
      console.error("WordPress設定の取得に失敗しました:", error?.message);
      throw new Error("WordPress設定が見つかりません。");
    }

    this.config = {
      id: data.id,
      name: data.name,
      url: data.url,
      username: data.username,
      applicationPassword: data.password, // Supabase側が「password」カラムの場合
      isActive: data.is_active,
      defaultCategory: data.default_category || "",
    };
  }
 
async testConnection(): Promise<boolean> {
  if (!this.config) {
    await this.loadActiveConfig();
  }
  if (!this.config) {
    return false;
  }
  try {
    const response = await axios.get(`${this.config.url}/wp-json/wp/v2/posts`, {
      headers: this.getAuthHeaders(),
      params: { per_page: 1 }
    });
    return response.status === 200;
  } catch (error) {
    console.error('WordPress接続テストエラー:', error);
    return false;
  }
}

  async publishArticle(article: Article, publishStatus: 'publish' | 'draft' = 'publish') {
  if (!this.config) {
    await this.loadActiveConfig();
  }
  if (!this.config) {
    return { success: false, error: 'WordPress設定が見つかりません' };
  }

  try {
    const processedContent = article.content;


      // Get category IDs - only use existing categories, don't create new ones
      const categoryIds = await this.getExistingCategoryIds(article.category);

      const postData = {
        title: article.title,
        content: processedContent,
        excerpt: article.excerpt,
        status: publishStatus,
        categories: categoryIds,
        meta: {
          _yoast_wpseo_focuskw: article.keywords.join(', '),
          _yoast_wpseo_metadesc: article.excerpt,
          _yoast_wpseo_title: article.title
        }
      };

      const response = await axios.post(
        `${this.config.url}/wp-json/wp/v2/posts`,
        postData,
        { headers: this.getAuthHeaders() }
      );

      if (response.status === 201) {
        return {
          success: true,
          wordPressId: response.data.id
        };
      }

      return {
        success: false,
        error: 'WordPress投稿に失敗しました'
      };
    } catch (error: any) {
      console.error('WordPress投稿エラー:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'WordPress投稿でエラーが発生しました'
      };
    }
  }

  async scheduleArticle(article: Article, publishDate: Date): Promise<{ success: boolean; wordPressId?: number; error?: string }> {
    if (!this.config) {
    await this.loadActiveConfig();
  }
    if (!this.config) {
      return { success: false, error: 'WordPress設定が見つかりません' };
    }
    try {
      // HTMLタグをそのまま使用（変換不要）
      const processedContent = article.content;

      // Get category IDs - only use existing categories, don't create new ones
      const categoryIds = await this.getExistingCategoryIds(article.category);

      const postData = {
        title: article.title,
        content: processedContent,
        excerpt: article.excerpt,
        status: 'future',
        date: publishDate.toISOString(),
        categories: categoryIds,
        meta: {
          _yoast_wpseo_focuskw: article.keywords.join(', '),
          _yoast_wpseo_metadesc: article.excerpt,
          _yoast_wpseo_title: article.title
        }
      };

      const response = await axios.post(
        `${this.config.url}/wp-json/wp/v2/posts`,
        postData,
        { headers: this.getAuthHeaders() }
      );

      if (response.status === 201) {
        return {
          success: true,
          wordPressId: response.data.id
        };
      }

      return {
        success: false,
        error: 'WordPress予約投稿に失敗しました'
      };
    } catch (error: any) {
      console.error('WordPress予約投稿エラー:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'WordPress予約投稿でエラーが発生しました'
      };
    }
  }

  async getRecentPosts(limit: number = 10): Promise<any[]> {
    if (!this.config) return [];
    try {
      const response = await axios.get(`${this.config.url}/wp-json/wp/v2/posts`, {
        headers: this.getAuthHeaders(),
        params: {
          per_page: limit,
          orderby: 'date',
          order: 'desc'
        }
      });
      return response.data;
    } catch (error) {
      console.error('WordPress記事取得エラー:', error);
      return [];
    }
  }

  async getAllPosts(params?: {
    status?: string;
    per_page?: number;
    page?: number;
    search?: string;
    orderby?: string;
    order?: string;
  }): Promise<{ posts: any[]; total: number; totalPages: number }> {
    if (!this.config) {
      await this.loadActiveConfig();
    }

    try {
      const queryParams: any = {
        per_page: params?.per_page || 100,
        page: params?.page || 1,
        orderby: params?.orderby || 'date',
        order: params?.order || 'desc',
        status: params?.status || 'any'
      };

      if (params?.search) {
        queryParams.search = params.search;
      }

      if (!this.config) return { posts: [], total: 0, totalPages: 0 };
      const response = await axios.get(`${this.config.url}/wp-json/wp/v2/posts`, {
        headers: this.getAuthHeaders(),
        params: queryParams
      });

      const total = parseInt(response.headers['x-wp-total'] || '0');
      const totalPages = parseInt(response.headers['x-wp-totalpages'] || '0');

      return {
        posts: response.data,
        total,
        totalPages
      };
    } catch (error) {
      console.error('WordPress記事一覧取得エラー:', error);
      return { posts: [], total: 0, totalPages: 0 };
    }
  }

  async getPostById(postId: string | number): Promise<any | null> {
    if (!this.config) {
      await this.loadActiveConfig();
    }
    if (!this.config) return null;

    try {
      const response = await axios.get(
        `${this.config.url}/wp-json/wp/v2/posts/${postId}`,
        { headers: this.getAuthHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('WordPress記事取得エラー:', error);
      return null;
    }
  }

  async deletePost(postId: string | number): Promise<boolean> {
    if (!this.config) {
      await this.loadActiveConfig();
    }
    if (!this.config) return false;

    try {
      const response = await axios.delete(
        `${this.config.url}/wp-json/wp/v2/posts/${postId}`,
        { headers: this.getAuthHeaders() }
      );
      return response.status === 200;
    } catch (error) {
      console.error('WordPress記事削除エラー:', error);
      return false;
    }
  }

  async getExistingCategories(): Promise<{ id: number; name: string; slug: string }[]> {
    if (!this.config) return [];
    try {
      const response = await axios.get(`${this.config.url}/wp-json/wp/v2/categories`, {
        headers: this.getAuthHeaders(),
        params: { per_page: 100 } // 最大100個のカテゴリを取得
      });
      
      return response.data.map((category: any) => ({
        id: category.id,
        name: category.name,
        slug: category.slug
      }));
    } catch (error) {
      console.error('既存カテゴリ取得エラー:', error);
      return [];
    }
  }

  private getAuthHeaders() {
    if (!this.config) throw new Error('WordPress設定が見つかりません');
    const credentials = btoa(`${this.config.username}:${this.config.applicationPassword}`);
    return {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json'
    };
  }

  private async getExistingCategoryIds(articleCategory: string): Promise<number[]> {
    if (!this.config) return [];
    try {
      const categoryIds: number[] = [];

      // First, try to add the default category from WordPress config (if it exists)
      if (this.config.defaultCategory) {
        const defaultCategoryId = await this.findExistingCategoryBySlugOrName(this.config.defaultCategory);
        if (defaultCategoryId) {
          categoryIds.push(defaultCategoryId);
          console.log(`デフォルトカテゴリ「${this.config.defaultCategory}」を使用: ID ${defaultCategoryId}`);
        } else {
          console.warn(`デフォルトカテゴリ「${this.config.defaultCategory}」が見つかりません`);
        }
      }

      // Then, try to add the article category if it's different from default and exists
      if (articleCategory && articleCategory !== this.config.defaultCategory) {
        const articleCategoryId = await this.findExistingCategoryBySlugOrName(articleCategory);
        if (articleCategoryId && !categoryIds.includes(articleCategoryId)) {
          categoryIds.push(articleCategoryId);
          console.log(`記事カテゴリ「${articleCategory}」を使用: ID ${articleCategoryId}`);
        } else {
          console.warn(`記事カテゴリ「${articleCategory}」が見つかりません`);
        }
      }

      // If no categories found, try to use the "Uncategorized" category (ID: 1)
      if (categoryIds.length === 0) {
        const uncategorizedId = await this.findExistingCategoryBySlugOrName('uncategorized');
        if (uncategorizedId) {
          categoryIds.push(uncategorizedId);
          console.log('「未分類」カテゴリを使用: ID 1');
        } else {
          console.warn('カテゴリが見つからないため、WordPressのデフォルトカテゴリを使用します');
          // Return empty array to let WordPress use its default category
        }
      }

      return categoryIds;
    } catch (error) {
      console.error('既存カテゴリID取得エラー:', error);
      return [];
    }
  }

  private async findExistingCategoryBySlugOrName(categoryIdentifier: string): Promise<number | null> {
    if (!this.config) return null;
    try {
      // First, try to find by slug
      let searchResponse = await axios.get(`${this.config.url}/wp-json/wp/v2/categories`, {
        headers: this.getAuthHeaders(),
        params: { slug: categoryIdentifier }
      });

      if (searchResponse.data.length > 0) {
        return searchResponse.data[0].id;
      }

      // If not found by slug, try to find by name
      searchResponse = await axios.get(`${this.config.url}/wp-json/wp/v2/categories`, {
        headers: this.getAuthHeaders(),
        params: { search: categoryIdentifier }
      });

      if (searchResponse.data.length > 0) {
        // Find exact match by name
        const exactMatch = searchResponse.data.find((cat: any) => 
          cat.name.toLowerCase() === categoryIdentifier.toLowerCase()
        );
        if (exactMatch) {
          return exactMatch.id;
        }
        // If no exact match, return the first result
        return searchResponse.data[0].id;
      }

      // Category not found - DO NOT CREATE NEW CATEGORY
      console.warn(`カテゴリ「${categoryIdentifier}」が見つかりません。新しいカテゴリは作成しません。`);
      return null;
    } catch (error) {
      console.error(`カテゴリ検索エラー (${categoryIdentifier}):`, error);
      return null;
    }
  }

  // Legacy method for backward compatibility
  private async getCategoryId(categoryName: string): Promise<number[]> {
    const categoryId = await this.findExistingCategoryBySlugOrName(categoryName);
    return categoryId ? [categoryId] : [];
  }
}

export async function saveWordPressConfig(
  name: string,
  wp_url: string,
  wp_username: string,
  wp_app_password: string,
  wp_category: string
): Promise<any> {
  if (!supabase) {
    throw new Error('Supabase is not initialized');
  }

  const { data, error } = await supabase
    .from('wordpress_configs')
    .insert({
      name,
      url: wp_url,
      username: wp_username,
      password: wp_app_password,
      category: wp_category,
      is_active: true
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving WordPress config:', error);
    throw new Error(`WordPress設定の保存に失敗しました: ${error.message}`);
  }

  return data;
}


