import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface WordPressConfig {
  id: string;
  name: string;
  url: string;
  username: string;
  password: string;
  category: string;
  is_active: boolean;
}

interface ScheduleSetting {
  id: string;
  wordpress_config_id: string;
  is_active: boolean;
  frequency: string;
  time: string;
  target_keywords: string[];
  publish_status: string;
}

interface AIConfig {
  id: string;
  provider: string;
  api_key: string;
  model: string;
  temperature: number;
  max_tokens: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.text();
    const params = body ? JSON.parse(body) : {};
    const forceExecute = params.forceExecute === true;

    console.log('Scheduler executor started at:', new Date().toISOString());
    if (forceExecute) {
      console.log('FORCE EXECUTE MODE: Ignoring time checks');
    }

    // 1. アクティブなAI設定を取得
    const { data: aiConfigs, error: aiError } = await supabase
      .from('ai_configs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);

    if (aiError || !aiConfigs || aiConfigs.length === 0) {
      console.error('No AI config found:', aiError);
      return new Response(
        JSON.stringify({ success: false, error: 'AI設定が見つかりません' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiConfig: AIConfig = aiConfigs[0];
    console.log('Using AI config:', aiConfig.provider, aiConfig.model);

    // 2. アクティブなスケジュール設定を取得
    const { data: schedules, error: schedError } = await supabase
      .from('schedule_settings')
      .select(`
        *,
        wordpress_configs!inner(*)
      `)
      .eq('is_active', true);

    if (schedError || !schedules || schedules.length === 0) {
      console.log('No active schedules found');
      return new Response(
        JSON.stringify({ success: true, message: 'アクティブなスケジュールがありません', executed: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${schedules.length} active schedules`);

    const results = [];
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    // 3. 各スケジュールを処理
    for (const schedule of schedules) {
      const scheduleSetting = schedule as any;
      const wpConfig: WordPressConfig = scheduleSetting.wordpress_configs;

      console.log(`Processing schedule for ${wpConfig.name} (${scheduleSetting.time})`);

      // 時刻チェック（±5分の範囲で実行）- forceExecuteモードでは無視
      const shouldExecute = forceExecute || await shouldExecuteNow(scheduleSetting.time, currentTime, scheduleSetting.frequency, scheduleSetting.id, supabase);

      if (shouldExecute) {
        console.log(`Executing schedule for ${wpConfig.name}`);
        
        try {
          const result = await executeSchedule(scheduleSetting, wpConfig, aiConfig, supabase);
          results.push(result);
        } catch (error: any) {
          console.error(`Failed to execute schedule for ${wpConfig.name}:`, error);
          results.push({
            wordpress_config_id: wpConfig.id,
            success: false,
            error: error.message
          });
        }
      } else {
        console.log(`Skipping schedule for ${wpConfig.name} - not time yet or already executed`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        executed: results.length,
        results,
        timestamp: now.toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Scheduler execution error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// 実行すべきかチェック
async function shouldExecuteNow(
  scheduleTime: string,
  currentTime: string,
  frequency: string,
  scheduleId: string,
  supabase: any
): Promise<boolean> {
  // 時刻が一致するかチェック（±5分）
  const [scheduleHour, scheduleMinute] = scheduleTime.split(':').map(Number);
  const [currentHour, currentMinute] = currentTime.split(':').map(Number);
  
  const scheduleMinutes = scheduleHour * 60 + scheduleMinute;
  const currentMinutes = currentHour * 60 + currentMinute;
  const diff = Math.abs(currentMinutes - scheduleMinutes);
  
  if (diff > 5) {
    return false; // 時刻が一致しない
  }

  // 最後の実行時刻をチェック
  const { data: lastExecution } = await supabase
    .from('execution_history')
    .select('executed_at')
    .eq('schedule_id', scheduleId)
    .order('executed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!lastExecution) {
    return true; // 初回実行
  }

  const lastExecutedAt = new Date(lastExecution.executed_at);
  const now = new Date();
  const hoursSinceLastExecution = (now.getTime() - lastExecutedAt.getTime()) / (1000 * 60 * 60);

  // 頻度に応じてチェック
  if (frequency === 'daily' && hoursSinceLastExecution >= 23) {
    return true;
  } else if (frequency === 'weekly' && hoursSinceLastExecution >= 24 * 6.5) {
    return true;
  } else if (frequency === 'biweekly' && hoursSinceLastExecution >= 24 * 13) {
    return true;
  } else if (frequency === 'monthly' && hoursSinceLastExecution >= 24 * 29) {
    return true;
  }

  return false;
}

// スケジュール実行
async function executeSchedule(
  schedule: any,
  wpConfig: WordPressConfig,
  aiConfig: AIConfig,
  supabase: any
) {
  // 1. 使用していないキーワードを選択
  const keyword = await selectUnusedKeyword(schedule.id, schedule.target_keywords, supabase);
  
  if (!keyword) {
    throw new Error('使用可能なキーワードがありません');
  }

  console.log(`Selected keyword: ${keyword}`);

  // 2. トレンド分析を実行（簡易版）
  const trendTitle = await generateTrendTitle(keyword, aiConfig);
  console.log(`Generated title: ${trendTitle}`);

  // 3. AI記事を生成
  const articleContent = await generateArticle(trendTitle, keyword, aiConfig);
  console.log(`Generated article (${articleContent.length} chars)`);

  // 4. WordPressに投稿
  const postId = await publishToWordPress(
    wpConfig,
    trendTitle,
    articleContent,
    schedule.publish_status
  );
  console.log(`Published to WordPress: Post ID ${postId}`);

  // 5. 実行履歴を保存
  await supabase.from('execution_history').insert({
    schedule_id: schedule.id,
    wordpress_config_id: wpConfig.id,
    executed_at: new Date().toISOString(),
    keyword_used: keyword,
    article_title: trendTitle,
    wordpress_post_id: postId,
    status: 'success'
  });

  return {
    wordpress_config_id: wpConfig.id,
    wordpress_config_name: wpConfig.name,
    success: true,
    keyword,
    title: trendTitle,
    post_id: postId
  };
}

// 未使用キーワードを選択
async function selectUnusedKeyword(
  scheduleId: string,
  allKeywords: string[],
  supabase: any
): Promise<string | null> {
  // 使用済みキーワードを取得
  const { data: history } = await supabase
    .from('execution_history')
    .select('keyword_used')
    .eq('schedule_id', scheduleId);

  const usedKeywords = new Set((history || []).map((h: any) => h.keyword_used));
  const availableKeywords = allKeywords.filter(k => !usedKeywords.has(k));

  if (availableKeywords.length === 0) {
    // 全て使い切ったらリセット
    console.log('All keywords used, resetting...');
    return allKeywords[Math.floor(Math.random() * allKeywords.length)];
  }

  // ランダムに選択
  return availableKeywords[Math.floor(Math.random() * availableKeywords.length)];
}

// トレンドタイトル生成
async function generateTrendTitle(keyword: string, aiConfig: AIConfig): Promise<string> {
  const prompt = `以下のキーワードに関する、SEOに最適化された魅力的な日本語ブログ記事のタイトルを1つだけ生成してください。\n\nキーワード: ${keyword}\n\nタイトルのみを出力してください。説明は不要です。`;

  if (aiConfig.provider === 'gemini') {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${aiConfig.model}:generateContent?key=${aiConfig.api_key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: aiConfig.temperature, maxOutputTokens: 100 }
        })
      }
    );

    const data = await response.json();
    return data.candidates[0].content.parts[0].text.trim();
  } else if (aiConfig.provider === 'openai') {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aiConfig.api_key}`
      },
      body: JSON.stringify({
        model: aiConfig.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: aiConfig.temperature,
        max_tokens: 100
      })
    });

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } else if (aiConfig.provider === 'claude') {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': aiConfig.api_key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: aiConfig.model,
        max_tokens: 100,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    return data.content[0].text.trim();
  }

  throw new Error('Unsupported AI provider');
}

// 記事生成
async function generateArticle(title: string, keyword: string, aiConfig: AIConfig): Promise<string> {
  const prompt = `以下のタイトルとキーワードで、SEOに最適化された日本語のブログ記事を書いてください。\n\nタイトル: ${title}\nキーワード: ${keyword}\n\n記事の構成:\n1. 導入部分\n2. 本文（見出しを使って構造化）\n3. まとめ\n\n文字数: 約2000文字`;

  if (aiConfig.provider === 'gemini') {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${aiConfig.model}:generateContent?key=${aiConfig.api_key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: aiConfig.temperature, maxOutputTokens: aiConfig.max_tokens }
        })
      }
    );

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  } else if (aiConfig.provider === 'openai') {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aiConfig.api_key}`
      },
      body: JSON.stringify({
        model: aiConfig.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: aiConfig.temperature,
        max_tokens: aiConfig.max_tokens
      })
    });

    const data = await response.json();
    return data.choices[0].message.content;
  } else if (aiConfig.provider === 'claude') {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': aiConfig.api_key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: aiConfig.model,
        max_tokens: aiConfig.max_tokens,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    return data.content[0].text;
  }

  throw new Error('Unsupported AI provider');
}

// WordPressに投稿
async function publishToWordPress(
  config: WordPressConfig,
  title: string,
  content: string,
  status: string
): Promise<string> {
  const auth = btoa(`${config.username}:${config.password}`);
  const wpApiUrl = `${config.url}/wp-json/wp/v2/posts`;

  const response = await fetch(wpApiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${auth}`
    },
    body: JSON.stringify({
      title,
      content,
      status,
      categories: config.category ? [parseInt(config.category)] : []
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`WordPress API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.id.toString();
}