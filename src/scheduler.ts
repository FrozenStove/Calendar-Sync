import * as cron from "node-cron";
import { CalendarManager } from "./calendar";

export class Scheduler {
  private static instance: Scheduler;
  private tasks: Map<string, cron.ScheduledTask>;

  private constructor() {
    this.tasks = new Map();
  }

  public static getInstance(): Scheduler {
    if (!Scheduler.instance) {
      Scheduler.instance = new Scheduler();
    }
    return Scheduler.instance;
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
    // Cancel existing task if it exists
    this.cancelTask(name);

    // Create new scheduled task
    const scheduledTask = cron.schedule(schedule, async () => {
      try {
        console.log(`Running scheduled task: ${name}`);
        await task();
        console.log(`Completed scheduled task: ${name}`);
      } catch (error) {
        console.error(`Error in scheduled task ${name}:`, error);
      }
    });

    // Store the task
    this.tasks.set(name, scheduledTask);
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
    }
  }

  /**
   * Cancel all scheduled tasks
   */
  public cancelAllTasks(): void {
    this.tasks.forEach((task) => task.stop());
    this.tasks.clear();
  }
}

// Example usage:
export const scheduleCalendarSync = (calendarUrl: string) => {
  const scheduler = Scheduler.getInstance();

  // Schedule calendar sync to run every night at midnight
  scheduler.scheduleTask(
    "calendarSync",
    "0 0 * * *", // Run at midnight every day
    async () => {
      try {
        const events = await CalendarManager.importFromUrl(calendarUrl);
        console.log(`Synced ${events.length} calendar events`);
      } catch (error) {
        console.error("Failed to sync calendar:", error);
      }
    }
  );
};
