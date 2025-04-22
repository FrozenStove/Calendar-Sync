import * as dotenv from "dotenv";
import { CalendarManager, CalendarEvent } from "./calendar";
import { scheduleCalendarSync } from "./scheduler";

dotenv.config();

function greet(name: string): string {
  console.log(123);
  const appName = process.env.APP_NAME || "Docker Project";
  return `Hello, ${name}! Welcome to ${appName}!`;
}

async function importCalendar(url: string): Promise<void> {
  try {
    console.log(`Importing calendar from: ${url}`);
    const events = await CalendarManager.importFromUrl(url);

    console.log("\nImported Events:");
    events.forEach((event: CalendarEvent) => {
      console.log("\n-------------------");
      console.log(`Title: ${event.summary}`);
      console.log(`Start: ${event.start.toLocaleString()}`);
      console.log(`End: ${event.end.toLocaleString()}`);
      if (event.location) console.log(`Location: ${event.location}`);
      if (event.description) console.log(`Description: ${event.description}`);
    });

    console.log(`\nTotal events imported: ${events.length}`);
  } catch (error) {
    console.error("Failed to import calendar:", error);
  }
}

// Example usage
console.log(greet("User"));
console.log(`Running in ${process.env.APP_ENV || "development"} mode`);

// Get calendar URL from environment variables
const calendarUrl =
  process.env.CALENDAR_URL || "https://example.com/calendar.ics";

// Initial calendar import
importCalendar(calendarUrl);

// Schedule nightly calendar sync
scheduleCalendarSync(calendarUrl);

console.log("Calendar sync scheduled to run nightly at midnight");
