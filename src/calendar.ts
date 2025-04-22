import * as ICAL from "ical.js";
import fetch from "node-fetch";

export interface CalendarEvent {
  summary: string;
  start: Date;
  end: Date;
  description?: string;
  location?: string;
  uid: string;
}

export class CalendarManager {
  /**
   * Import calendar from a URL
   * @param url URL of the iCalendar file
   * @returns Promise<CalendarEvent[]>
   */
  static async importFromUrl(url: string): Promise<CalendarEvent[]> {
    try {
      const response = await fetch(url);
      const icsData = await response.text();
      return this.parseICS(icsData);
    } catch (error) {
      console.error("Error importing calendar:", error);
      throw error;
    }
  }

  /**
   * Import calendar from a local file
   * @param filePath Path to the local iCalendar file
   * @returns Promise<CalendarEvent[]>
   */
  static async importFromFile(filePath: string): Promise<CalendarEvent[]> {
    try {
      const fs = require("fs").promises;
      const icsData = await fs.readFile(filePath, "utf-8");
      return this.parseICS(icsData);
    } catch (error) {
      console.error("Error importing calendar:", error);
      throw error;
    }
  }

  /**
   * Parse ICS data into CalendarEvent array
   * @param icsData Raw ICS data string
   * @returns CalendarEvent[]
   */
  private static parseICS(icsData: string): CalendarEvent[] {
    const jcalData = ICAL.parse(icsData);
    const comp = new ICAL.Component(jcalData);
    const vevents = comp.getAllSubcomponents("vevent");

    return vevents.map((vevent) => {
      const event = new ICAL.Event(vevent);
      return {
        summary: event.summary,
        start: event.startDate.toJSDate(),
        end: event.endDate.toJSDate(),
        description: event.description,
        location: event.location,
        uid: event.uid,
      };
    });
  }
}
