import { supabase } from './supabaseClient';
import { WordPressConfig, AIConfig, ScheduleSettings } from '../types';

class SupabaseSchedulerService {
  async saveWordPressConfig(config: WordPressConfig): Promise<string> {
    if (!supabase) {
      console.warn('Supabase not initialized');
      return config.id;
    }

    const { scheduleSettings, ...wpConfig } = config;

    const { data, error } = await supabase
      .from('wordpress_configs')
      .upsert({
        id: wpConfig.id,
        name: wpConfig.name,
        url: wpConfig.url,
        username: wpConfig.username,
        password: wpConfig.applicationPassword,
        category: wpConfig.category || wpConfig.defaultCategory || '',
        is_active: wpConfig.isActive,
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving WordPress config:', error);
      throw new Error(`WordPress設定の保存に失敗しました: ${error.message}`);
    }

    if (scheduleSettings) {
      await this.saveScheduleSettings(data.id, scheduleSettings);
    }

    return data.id;
  }

  async saveScheduleSettings(wpConfigId: string, settings: ScheduleSettings): Promise<void> {
    if (!supabase) return;

    const { data: existing } = await supabase
      .from('schedule_settings')
      .select('id')
      .eq('wordpress_config_id', wpConfigId)
      .maybeSingle();

    const scheduleData = {
      wordpress_config_id: wpConfigId,
      is_active: settings.isActive,
      frequency: settings.frequency,
      time: settings.time,
      target_keywords: settings.targetKeywords,
      publish_status: settings.publishStatus,
    };

    if (existing) {
      const { error } = await supabase
        .from('schedule_settings')
        .update(scheduleData)
        .eq('id', existing.id);

      if (error) {
        console.error('Error updating schedule settings:', error);
        throw new Error(`スケジュール設定の更新に失敗しました: ${error.message}`);
      }
    } else {
      const { error } = await supabase
        .from('schedule_settings')
        .insert(scheduleData);

      if (error) {
        console.error('Error creating schedule settings:', error);
        throw new Error(`スケジュール設定の作成に失敗しました: ${error.message}`);
      }
    }
  }

  async loadWordPressConfigs(): Promise<WordPressConfig[]> {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('wordpress_configs')
      .select(`
        *,
        schedule_settings (*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading WordPress configs:', error);
      throw new Error(`WordPress設定の読み込みに失敗しました: ${error.message}`);
    }

    return (data || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      url: item.url,
      username: item.username,
      applicationPassword: item.password,
      isActive: item.is_active,
      category: item.category,
      defaultCategory: item.category,
      scheduleSettings: item.schedule_settings?.[0] ? {
        isActive: item.schedule_settings[0].is_active,
        frequency: item.schedule_settings[0].frequency,
        time: item.schedule_settings[0].time,
        targetKeywords: item.schedule_settings[0].target_keywords,
        publishStatus: item.schedule_settings[0].publish_status,
        timezone: 'Asia/Tokyo',
      } : undefined,
    }));
  }

  async deleteWordPressConfig(id: string): Promise<void> {
    if (!supabase) return;

    const { error } = await supabase
      .from('wordpress_configs')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting WordPress config:', error);
      throw new Error(`WordPress設定の削除に失敗しました: ${error.message}`);
    }
  }

  async saveAIConfig(config: AIConfig): Promise<void> {
    if (!supabase) return;

    const { data: existing } = await supabase
      .from('ai_configs')
      .select('id')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const aiData = {
      provider: config.provider,
      api_key: config.apiKey,
      model: config.model,
      temperature: config.temperature || 0.7,
      max_tokens: config.maxTokens || 4000,
    };

    if (existing) {
      const { error } = await supabase
        .from('ai_configs')
        .update(aiData)
        .eq('id', existing.id);

      if (error) {
        console.error('Error updating AI config:', error);
        throw new Error(`AI設定の更新に失敗しました: ${error.message}`);
      }
    } else {
      const { error } = await supabase
        .from('ai_configs')
        .insert(aiData);

      if (error) {
        console.error('Error creating AI config:', error);
        throw new Error(`AI設定の作成に失敗しました: ${error.message}`);
      }
    }
  }

  async loadAIConfig(): Promise<AIConfig | null> {
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('ai_configs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error loading AI config:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    return {
      provider: data.provider as any,
      apiKey: data.api_key,
      model: data.model,
      temperature: data.temperature,
      maxTokens: data.max_tokens,
    };
  }

  async getExecutionHistory(limit = 50) {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('execution_history')
      .select(`
        *,
        wordpress_configs (name, url)
      `)
      .order('executed_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error loading execution history:', error);
      return [];
    }

    return data || [];
  }

  async triggerScheduler(forceExecute = true): Promise<any> {
    if (!supabase) {
      throw new Error('Supabase is not initialized');
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const response = await fetch(`${supabaseUrl}/functions/v1/scheduler-executor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ forceExecute }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Scheduler execution failed: ${errorText}`);
    }

    return await response.json();
  }
}

export const supabaseSchedulerService = new SupabaseSchedulerService();
