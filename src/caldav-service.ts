import { createDAVClient } from "tsdav";
import * as ICAL from "ical.js";
import { CalendarEvent } from "./calendar";

export interface iCloudCalendarConfig {
  username: string; // Apple ID
  appSpecificPassword: string; // App-specific password for iCloud
  calendarUrl?: string; // Optional custom CalDAV URL
  userFilter?: string; // Filter events for specific user (name or email)
}

export class iCloudCalendarService {
  private client: any | null = null;
  private config: iCloudCalendarConfig;

  constructor(config: iCloudCalendarConfig) {
    this.config = config;
  }

  /**
   * Initialize connection to iCloud CalDAV
   */
  async initialize(): Promise<void> {
    try {
      const serverUrl = this.config.calendarUrl || 'https://caldav.icloud.com';

      this.client = await createDAVClient({
        serverUrl,
        credentials: {
          username: this.config.username,
          password: this.config.appSpecificPassword,
        },
        authMethod: "Basic",
        defaultAccountType: "caldav",
      });

      // Test the connection
      await this.client.fetchCalendars();
      console.log('Successfully connected to iCloud CalDAV');
    } catch (error) {
      console.error('Failed to initialize iCloud CalDAV:', error);
      throw new Error(`iCloud CalDAV initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fetch events from iCloud calendar within date range
   */
  async getEvents(startDate: Date, endDate: Date): Promise<CalendarEvent[]> {
    if (!this.client) {
      throw new Error('iCloud CalDAV client not initialized');
    }

    try {
      const calendars = await this.client.fetchCalendars();
      const allEvents: CalendarEvent[] = [];

      for (const calendar of calendars) {
        console.log(`Fetching events from calendar: ${calendar.displayName}`);

        const calendarObjects = await this.client.fetchCalendarObjects({
          calendar,
          timeRange: {
            start: startDate.toISOString(),
            end: endDate.toISOString(),
          },
        });

        for (const calendarObject of calendarObjects) {
          try {
            const events = this.parseICalData(calendarObject.data);
            const filteredEvents = this.filterEventsForUser(events);
            allEvents.push(...filteredEvents);
          } catch (parseError) {
            console.warn(`Failed to parse calendar object: ${parseError}`);
          }
        }
      }

      console.log(`Fetched ${allEvents.length} events from iCloud calendar`);
      return allEvents;
    } catch (error) {
      console.error('Failed to fetch iCloud calendar events:', error);
      throw error;
    }
  }

  /**
   * Parse iCal data into CalendarEvent objects
   */
  private parseICalData(icalData: string): CalendarEvent[] {
    try {
      const jcalData = ICAL.parse(icalData);
      const comp = new ICAL.Component(jcalData);
      const vevents = comp.getAllSubcomponents('vevent');

      return vevents.map((vevent: any) => {
        const event = new ICAL.Event(vevent);

        return {
          summary: event.summary || '',
          start: event.startDate.toJSDate(),
          end: event.endDate.toJSDate(),
          description: event.description || '',
          location: event.location || '',
          uid: event.uid || '',
          source: 'icloud',
          lastModified: event.lastModifiedDate?.toJSDate(),
          status: event.status?.toLowerCase(),
        };
      });
    } catch (error) {
      console.error('Failed to parse iCal data:', error);
      return [];
    }
  }

  /**
   * Filter events for the specific user based on configuration
   */
  private filterEventsForUser(events: CalendarEvent[]): CalendarEvent[] {
    if (!this.config.userFilter) {
      return events;
    }

    const userFilter = this.config.userFilter.toLowerCase();

    return events.filter(event => {
      // Check if user is mentioned in summary, description, or location
      const summary = (event.summary || '').toLowerCase();
      const description = (event.description || '').toLowerCase();
      const location = (event.location || '').toLowerCase();

      return summary.includes(userFilter) ||
        description.includes(userFilter) ||
        location.includes(userFilter);
    });
  }

  /**
   * Test the connection to iCloud CalDAV
   */
  async testConnection(): Promise<void> {
    if (!this.client) {
      await this.initialize();
    }

    try {
      const calendars = await this.client!.fetchCalendars();
      console.log(`Connected to iCloud CalDAV. Found ${calendars.length} calendars.`);
    } catch (error) {
      console.error('iCloud CalDAV connection test failed:', error);
      throw error;
    }
  }
}
