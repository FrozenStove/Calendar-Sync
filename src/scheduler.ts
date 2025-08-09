import * as cron from "node-cron";
import { CalendarSyncService, CalendarSyncConfig, SyncResult } from "./calendar-sync-service";

export class CalendarScheduler {
  private static instance: CalendarScheduler;
  private tasks: Map<string, cron.ScheduledTask>;
  private syncService: CalendarSyncService | null = null;

  private constructor() {
    this.tasks = new Map();
  }

  public static getInstance(): CalendarScheduler {
    if (!CalendarScheduler.instance) {
      CalendarScheduler.instance = new CalendarScheduler();
    }
    return CalendarScheduler.instance;
  }

  /**
   * Initialize the scheduler with sync configuration
   */
  public async initialize(config: CalendarSyncConfig): Promise<void> {
    this.syncService = new CalendarSyncService(config);
    await this.syncService.initialize();
    console.log('Calendar scheduler initialized successfully');
  }

  /**
   * Schedule the calendar sync to run weekly
   * @param schedule Cron schedule expression (default: weekly on Sundays at 2 AM)
   */
  public scheduleWeeklySync(schedule: string = "0 2 * * 0"): void {
    if (!this.syncService) {
      throw new Error('Scheduler not initialized. Call initialize() first.');
    }

    this.scheduleTask(
      'calendar-sync',
      schedule,
      async () => {
        const result = await this.syncService!.performSync();
        this.logSyncResult(result);

        // Send notification or alert if there were errors
        if (result.errors.length > 0) {
          console.error(`Sync completed with ${result.errors.length} errors. Consider manual review.`);
        }
      }
    );

    console.log(`Scheduled weekly calendar sync with cron: ${schedule}`);
  }

  /**
   * Schedule a task to run at a specific time
   * @param name Unique name for the task
   * @param schedule Cron schedule expression
   * @param task Function to execute
   */
  public scheduleTask(
    name: string,
    schedule: string,
    task: () => Promise<void>
  ): void {
    // Validate cron expression
    if (!cron.validate(schedule)) {
      throw new Error(`Invalid cron schedule: ${schedule}`);
    }

    // Cancel existing task if it exists
    this.cancelTask(name);

    // Create new scheduled task
    const scheduledTask = cron.schedule(schedule, async () => {
      const startTime = new Date();
      try {
        console.log(`[${startTime.toISOString()}] Starting scheduled task: ${name}`);
        await task();
        const endTime = new Date();
        const duration = endTime.getTime() - startTime.getTime();
        console.log(`[${endTime.toISOString()}] Completed scheduled task: ${name} (${duration}ms)`);
      } catch (error) {
        const endTime = new Date();
        const duration = endTime.getTime() - startTime.getTime();
        console.error(`[${endTime.toISOString()}] Error in scheduled task ${name} after ${duration}ms:`, error);
      }
    });

    // Start the task immediately
    scheduledTask.start();

    // Store the task
    this.tasks.set(name, scheduledTask);
    console.log(`Scheduled task "${name}" with schedule: ${schedule}`);
  }

  /**
   * Run sync immediately (useful for testing or manual triggers)
   */
  public async runSyncNow(): Promise<SyncResult> {
    if (!this.syncService) {
      throw new Error('Scheduler not initialized. Call initialize() first.');
    }

    console.log('Running manual calendar sync...');
    const result = await this.syncService.performSync();
    this.logSyncResult(result);
    return result;
  }

  /**
   * Get sync preview without performing actual sync
   */
  public async getSyncPreview(): Promise<any> {
    if (!this.syncService) {
      throw new Error('Scheduler not initialized. Call initialize() first.');
    }

    return await this.syncService.getSyncPreview();
  }

  /**
   * Test calendar connections
   */
  public async testConnections(): Promise<void> {
    if (!this.syncService) {
      throw new Error('Scheduler not initialized. Call initialize() first.');
    }

    await this.syncService.testConnections();
  }

  /**
   * Cancel a scheduled task
   * @param name Name of the task to cancel
   */
  public cancelTask(name: string): void {
    const task = this.tasks.get(name);
    if (task) {
      task.stop();
      this.tasks.delete(name);
      console.log(`Cancelled scheduled task: ${name}`);
    }
  }

  /**
   * Cancel all scheduled tasks
   */
  public cancelAllTasks(): void {
    console.log(`Cancelling ${this.tasks.size} scheduled tasks...`);
    this.tasks.forEach((task, name) => {
      task.stop();
      console.log(`Cancelled task: ${name}`);
    });
    this.tasks.clear();
  }

  /**
   * Get list of active tasks
   */
  public getActiveTasks(): string[] {
    return Array.from(this.tasks.keys());
  }

  /**
   * Log sync results in a formatted way
   */
  private logSyncResult(result: SyncResult): void {
    console.log('=== Calendar Sync Results ===');
    console.log(`Events processed: ${result.eventsProcessed}`);
    console.log(`Events created: ${result.eventsCreated}`);
    console.log(`Events updated: ${result.eventsUpdated}`);
    console.log(`Events deleted: ${result.eventsDeleted}`);

    if (result.errors.length > 0) {
      console.log(`Errors: ${result.errors.length}`);
      result.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }
    console.log('=============================');
  }

  /**
   * Graceful shutdown - cancel all tasks
   */
  public shutdown(): void {
    console.log('Shutting down calendar scheduler...');
    this.cancelAllTasks();
    console.log('Calendar scheduler shut down complete');
  }
}
