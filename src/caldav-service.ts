import { createDAVClient } from "tsdav";
import { CalendarEvent } from "./calendar";

export interface CalendarConfig {
  url: string;
  username: string;
  password: string;
  type: "caldav" | "carddav";
}

export class CalDAVService {
  private static instance: CalDAVService;
  private clients: Map<string, any> = new Map();

  private constructor() {}

  public static getInstance(): CalDAVService {
    if (!CalDAVService.instance) {
      CalDAVService.instance = new CalDAVService();
    }
    return CalDAVService.instance;
  }

  /**
   * Initialize a calendar connection
   */
  public async initializeCalendar(config: CalendarConfig): Promise<void> {
    try {
      const client = await createDAVClient({
        serverUrl: config.url,
        credentials: {
          username: config.username,
          password: config.password,
        },
        authMethod: "Basic",
        defaultAccountType: config.type,
      });

      // Test the connection by fetching calendars
      await client.fetchCalendars();
      this.clients.set(config.url, client);
      console.log(`Successfully connected to ${config.type} calendar`);
    } catch (error) {
      console.error(`Failed to initialize ${config.type} calendar:`, error);
      throw error;
    }
  }

  /**
   * Fetch events from a calendar
   */
  public async getEvents(
    config: CalendarConfig,
    start: Date,
    end: Date
  ): Promise<CalendarEvent[]> {
    const client = this.clients.get(config.url);
    if (!client) {
      throw new Error("Calendar not initialized");
    }

    try {
      const calendars = await client.fetchCalendars();
      const events: CalendarEvent[] = [];

      for (const calendar of calendars) {
        const calendarEvents = await client.fetchCalendarObjects({
          calendar,
          timeRange: {
            start: start.toISOString(),
            end: end.toISOString(),
          },
        });

        for (const event of calendarEvents) {
          events.push({
            summary: event.filename,
            start: new Date(event.data.dtstart),
            end: new Date(event.data.dtend),
            description: event.data.description,
            location: event.data.location,
            uid: event.url,
          });
        }
      }

      return events;
    } catch (error) {
      console.error("Failed to fetch events:", error);
      throw error;
    }
  }

  /**
   * Subscribe to calendar changes
   */
  public async subscribeToChanges(
    config: CalendarConfig,
    webhookUrl: string
  ): Promise<void> {
    const client = this.clients.get(config.url);
    if (!client) {
      throw new Error("Calendar not initialized");
    }

    try {
      await client.createSubscription({
        url: webhookUrl,
        properties: ["VEVENT"],
      });
      console.log(`Successfully subscribed to ${config.type} calendar changes`);
    } catch (error) {
      console.error("Failed to subscribe to changes:", error);
      throw error;
    }
  }
}
