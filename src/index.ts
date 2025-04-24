import * as dotenv from "dotenv";
import { CalDAVService, CalendarConfig } from "./caldav-service";
import { scheduleCalendarSync } from "./scheduler";

dotenv.config();

function greet(name: string): string {
  console.log(123);
  const appName = process.env.APP_NAME || "Docker Project";
  return `Hello, ${name}! Welcome to ${appName}!`;
}

async function initializeCalendars() {
  const caldavService = CalDAVService.getInstance();

  // Initialize Google Calendar
  const googleConfig: CalendarConfig = {
    url: process.env.GOOGLE_CALENDAR_URL!,
    username: process.env.GOOGLE_CALENDAR_USERNAME!,
    password: process.env.GOOGLE_CALENDAR_PASSWORD!,
    type: "caldav",
  };

  // Initialize Apple Calendar
  const appleConfig: CalendarConfig = {
    url: process.env.APPLE_CALENDAR_URL!,
    username: process.env.APPLE_CALENDAR_USERNAME!,
    password: process.env.APPLE_CALENDAR_PASSWORD!,
    type: "caldav",
  };

  try {
    await caldavService.initializeCalendar(googleConfig);
    await caldavService.initializeCalendar(appleConfig);
    console.log("Successfully initialized all calendars");

    // Schedule sync for both calendars
    scheduleCalendarSync(googleConfig);
    scheduleCalendarSync(appleConfig);
  } catch (error) {
    console.error("Failed to initialize calendars:", error);
    process.exit(1);
  }
}

// Initialize calendars and start the application
initializeCalendars().then(() => {
  console.log("Calendar sync service started");
});

// Example usage
console.log(greet("User"));
console.log(`Running in ${process.env.APP_ENV || "development"} mode`);
