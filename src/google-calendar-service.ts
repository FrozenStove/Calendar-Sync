import { google, calendar_v3 } from 'googleapis';
import { JWT } from 'google-auth-library';
import { CalendarEvent } from './calendar';
import { v4 as uuidv4 } from 'uuid';

export interface GoogleCalendarConfig {
    serviceAccountEmail: string;
    serviceAccountPrivateKey: string;
    calendarId: string;
    impersonateUser?: string; // For domain-wide delegation
}

export class GoogleCalendarService {
    private calendar: calendar_v3.Calendar;
    private calendarId: string;
    private auth: JWT;

    constructor(config: GoogleCalendarConfig) {
        // Create JWT client for service account authentication
        this.auth = new JWT({
            email: config.serviceAccountEmail,
            key: config.serviceAccountPrivateKey.replace(/\\n/g, '\n'),
            scopes: ['https://www.googleapis.com/auth/calendar'],
            subject: config.impersonateUser, // For domain-wide delegation if needed
        });

        this.calendar = google.calendar({ version: 'v3', auth: this.auth });
        this.calendarId = config.calendarId;
    }

    /**
     * Test the connection to Google Calendar
     */
    async testConnection(): Promise<void> {
        try {
            await this.calendar.calendarList.list({ maxResults: 1 });
            console.log('Successfully connected to Google Calendar');
        } catch (error) {
            console.error('Failed to connect to Google Calendar:', error);
            throw error;
        }
    }

    /**
     * Get events from Google Calendar within a date range
     */
    async getEvents(startDate: Date, endDate: Date): Promise<CalendarEvent[]> {
        try {
            const response = await this.calendar.events.list({
                calendarId: this.calendarId,
                timeMin: startDate.toISOString(),
                timeMax: endDate.toISOString(),
                singleEvents: true,
                orderBy: 'startTime',
                maxResults: 2500, // Google's max limit
            });

            const events = response.data.items || [];
            return events.map(this.convertGoogleEventToCalendarEvent);
        } catch (error) {
            console.error('Failed to fetch Google Calendar events:', error);
            throw error;
        }
    }

    /**
     * Create a new event in Google Calendar
     */
    async createEvent(event: CalendarEvent): Promise<string> {
        try {
            const googleEvent: any = {
                summary: event.summary,
                description: event.description,
                location: event.location,
                start: {
                    dateTime: event.start.toISOString(),
                    timeZone: 'UTC',
                },
                end: {
                    dateTime: event.end.toISOString(),
                    timeZone: 'UTC',
                },
                // Add a custom property to track the source
                extendedProperties: {
                    private: {
                        sourceUid: event.uid,
                        source: event.source || 'icloud-sync',
                        syncId: uuidv4(),
                    },
                },
            };

            const response = await this.calendar.events.insert({
                calendarId: this.calendarId,
                requestBody: googleEvent,
            });

            console.log(`Created Google Calendar event: ${event.summary}`);
            return response.data.id!;
        } catch (error) {
            console.error('Failed to create Google Calendar event:', error);
            throw error;
        }
    }

    /**
     * Update an existing event in Google Calendar
     */
    async updateEvent(eventId: string, event: CalendarEvent): Promise<void> {
        try {
            const googleEvent: any = {
                summary: event.summary,
                description: event.description,
                location: event.location,
                start: {
                    dateTime: event.start.toISOString(),
                    timeZone: 'UTC',
                },
                end: {
                    dateTime: event.end.toISOString(),
                    timeZone: 'UTC',
                },
                extendedProperties: {
                    private: {
                        sourceUid: event.uid,
                        source: event.source || 'icloud-sync',
                        lastSynced: new Date().toISOString(),
                    },
                },
            };

            await this.calendar.events.update({
                calendarId: this.calendarId,
                eventId: eventId,
                requestBody: googleEvent,
            });

            console.log(`Updated Google Calendar event: ${event.summary}`);
        } catch (error) {
            console.error('Failed to update Google Calendar event:', error);
            throw error;
        }
    }

    /**
     * Delete an event from Google Calendar
     */
    async deleteEvent(eventId: string): Promise<void> {
        try {
            await this.calendar.events.delete({
                calendarId: this.calendarId,
                eventId: eventId,
            });

            console.log(`Deleted Google Calendar event: ${eventId}`);
        } catch (error) {
            console.error('Failed to delete Google Calendar event:', error);
            throw error;
        }
    }

    /**
     * Find events that were synced from a specific source
     */
    async findSyncedEvents(sourceUid?: string): Promise<Map<string, string>> {
        try {
            const response = await this.calendar.events.list({
                calendarId: this.calendarId,
                privateExtendedProperty: sourceUid
                    ? [`sourceUid=${sourceUid}`]
                    : ['source=icloud-sync'],
                maxResults: 2500,
            });

            const syncedEvents = new Map<string, string>();
            const events = (response as any).data.items || [];

            events.forEach((event: any) => {
                const sourceUidProp = event.extendedProperties?.private?.sourceUid;
                if (sourceUidProp && event.id) {
                    syncedEvents.set(sourceUidProp, event.id);
                }
            });

            return syncedEvents;
        } catch (error) {
            console.error('Failed to find synced events:', error);
            throw error;
        }
    }

    /**
 * Convert Google Calendar event to our internal format
 */
    private convertGoogleEventToCalendarEvent(googleEvent: any): CalendarEvent {
        const startDate = googleEvent.start?.dateTime
            ? new Date(googleEvent.start.dateTime)
            : new Date(googleEvent.start?.date || '');

        const endDate = googleEvent.end?.dateTime
            ? new Date(googleEvent.end.dateTime)
            : new Date(googleEvent.end?.date || '');

        return {
            summary: googleEvent.summary || '',
            start: startDate,
            end: endDate,
            description: googleEvent.description,
            location: googleEvent.location,
            uid: googleEvent.id || '',
            source: 'google',
            lastModified: googleEvent.updated ? new Date(googleEvent.updated) : undefined,
            status: googleEvent.status,
        };
    }
}