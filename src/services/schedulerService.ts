interface ScheduleSettings {
  isActive: boolean;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  time: string;
  targetKeywords: string[];
  publishStatus: 'publish' | 'draft';
}

interface WordPressConfig {
  id: string;
  name: string;
  url: string;
  username: string;
  password: string;
  category: string;
  isActive: boolean;
  scheduleSettings?: ScheduleSettings;
}

interface AIConfig {
  provider: string;
  apiKey: string;
  model: string;
}

interface SchedulerStatus {
  isRunning: boolean;
  lastExecutionTimes: Record<string, string>;
  nextExecutionTimes: Record<string, string>;
  activeConfigs: string[];
}

class SchedulerService {
  private static instance: SchedulerService;
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private isRunning = false;
  private lastExecutionTimes: Record<string, string> = {};
  private usedKeywords: Record<string, Set<string>> = {};

  constructor() {
    this.loadState();
    this.initializeScheduler();
  }

  static getInstance(): SchedulerService {
    if (!SchedulerService.instance) {
      SchedulerService.instance = new SchedulerService();
    }
    return SchedulerService.instance;
  }

  private loadState(): void {
    try {
      const savedState = localStorage.getItem('schedulerState');
      if (savedState) {
        const state = JSON.parse(savedState);
        this.lastExecutionTimes = state.lastExecutionTimes || {};
        this.usedKeywords = state.usedKeywords || {};
        
        // Convert usedKeywords back to Sets
        Object.keys(this.usedKeywords).forEach(configId => {
          if (Array.isArray(this.usedKeywords[configId])) {
            this.usedKeywords[configId] = new Set(this.usedKeywords[configId] as any);
          }
        });
      }
    } catch (error) {
      console.error('Failed to load scheduler state:', error);
    }
  }

  private saveState(): void {
    try {
      const state = {
        lastExecutionTimes: this.lastExecutionTimes,
        usedKeywords: Object.fromEntries(
          Object.entries(this.usedKeywords).map(([key, value]) => [key, Array.from(value)])
        )
      };
      localStorage.setItem('schedulerState', JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save scheduler state:', error);
    }
  }

  private initializeScheduler(): void {
    // Check if scheduler was running before page reload
    const wasRunning = localStorage.getItem('schedulerWasRunning') === 'true';
    if (wasRunning) {
      // Auto-start will be handled by the component when configs are available
      console.log('Scheduler was running before reload, will auto-start when configs are available');
    }
  }

  start(): void {
    if (this.isRunning) {
      console.log('Scheduler is already running');
      return;
    }

    this.isRunning = true;
    this.scheduleAllConfigs();
    console.log('Scheduler started');
  }

  stop(): void {
    this.isRunning = false;
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
    console.log('Scheduler stopped');
  }

  private scheduleAllConfigs(): void {
    // This would be implemented to schedule all active WordPress configs
    // For now, just log that scheduling is happening
    console.log('Scheduling all active configurations');
  }

  restartConfigScheduler(configId: string): void {
    // Clear existing timer for this config
    const existingTimer = this.timers.get(configId);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.timers.delete(configId);
    }

    // Reschedule if scheduler is running
    if (this.isRunning) {
      this.scheduleConfig(configId);
    }
  }

  private scheduleConfig(configId: string): void {
    // Implementation for scheduling a specific config
    console.log(`Scheduling config: ${configId}`);
  }

  getSchedulerStatus(): SchedulerStatus {
    return {
      isRunning: this.isRunning,
      lastExecutionTimes: this.lastExecutionTimes,
      nextExecutionTimes: this.calculateNextExecutionTimes(),
      activeConfigs: Array.from(this.timers.keys())
    };
  }

  private calculateNextExecutionTimes(): Record<string, string> {
    // Calculate next execution times for all configs
    return {};
  }

  getDetailedStatus(): any {
    return {
      isRunning: this.isRunning,
      activeTimers: this.timers.size,
      lastExecutionTimes: this.lastExecutionTimes,
      usedKeywords: Object.fromEntries(
        Object.entries(this.usedKeywords).map(([key, value]) => [key, Array.from(value)])
      ),
      configs: []
    };
  }

  clearExecutionHistory(): void {
    this.lastExecutionTimes = {};
    this.usedKeywords = {};
    this.saveState();
    console.log('Execution history cleared');
  }

  async manualTriggerExecution(): Promise<void> {
    console.log('Manual execution triggered');
    // Implementation for manual trigger
  }

  async testDailyGeneration(keywords: string[]): Promise<void> {
    console.log('Test generation with keywords:', keywords);
    // Implementation for test generation
  }
}

// Export singleton instance
export const schedulerService = SchedulerService.getInstance();