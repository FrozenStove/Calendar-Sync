import * as cron from "node-cron";
import { CalDAVService, CalendarConfig } from "./caldav-service";

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
export const scheduleCalendarSync = (config: CalendarConfig) => {
  const scheduler = Scheduler.getInstance();
  const caldavService = CalDAVService.getInstance();

  scheduler.scheduleTask(
    `calendarSync-${config.type}`,
    "0 0 * * *", // Run at midnight every day
    async () => {
      try {
        const start = new Date();
        const end = new Date();
        end.setMonth(end.getMonth() + 1);

        const events = await caldavService.getEvents(config, start, end);
        console.log(
          `Synced ${events.length} events from ${config.type} calendar`
        );
      } catch (error) {
        console.error(`Failed to sync ${config.type} calendar:`, error);
      }
    }
  );
};
