// Calendar event interface for both Google and Apple calendars
export interface CalendarEvent {
  summary: string;
  start: Date;
  end: Date;
  description?: string;
  location?: string;
  uid: string;
  source?: string; // To track which calendar this came from
  lastModified?: Date;
  status?: string;
}
