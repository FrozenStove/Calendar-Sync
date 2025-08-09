import { iCloudCalendarService, iCloudCalendarConfig } from './caldav-service';
import { GoogleCalendarService, GoogleCalendarConfig } from './google-calendar-service';
import { CalendarEvent } from './calendar';

export interface CalendarSyncConfig {
    icloud: iCloudCalendarConfig;
    google: GoogleCalendarConfig;
    syncWindowDays: number; // How many days ahead to sync
    dryRun?: boolean; // If true, only log what would be done without making changes
}

export interface SyncResult {
    eventsProcessed: number;
    eventsCreated: number;
    eventsUpdated: number;
    eventsDeleted: number;
    errors: string[];
}

export class CalendarSyncService {
    private icloudService: iCloudCalendarService;
    private googleService: GoogleCalendarService;
    private config: CalendarSyncConfig;

    constructor(config: CalendarSyncConfig) {
        this.config = config;
        this.icloudService = new iCloudCalendarService(config.icloud);
        this.googleService = new GoogleCalendarService(config.google);
    }

    /**
     * Initialize both calendar services
     */
    async initialize(): Promise<void> {
        console.log('Initializing calendar sync service...');

        try {
            await Promise.all([
                this.icloudService.initialize(),
                this.googleService.testConnection()
            ]);

            console.log('Calendar sync service initialized successfully');
        } catch (error) {
            console.error('Failed to initialize calendar sync service:', error);
            throw error;
        }
    }

    /**
     * Perform a full sync from iCloud to Google Calendar
     */
    async performSync(): Promise<SyncResult> {
        console.log('Starting calendar sync...');

        const result: SyncResult = {
            eventsProcessed: 0,
            eventsCreated: 0,
            eventsUpdated: 0,
            eventsDeleted: 0,
            errors: []
        };

        try {
            // Calculate sync window
            const startDate = new Date();
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + this.config.syncWindowDays);

            console.log(`Syncing events from ${startDate.toDateString()} to ${endDate.toDateString()}`);

            // Fetch events from both calendars
            const [icloudEvents, existingSyncMap] = await Promise.all([
                this.icloudService.getEvents(startDate, endDate),
                this.googleService.findSyncedEvents()
            ]);

            result.eventsProcessed = icloudEvents.length;
            console.log(`Found ${icloudEvents.length} events in iCloud calendar`);

            // Process each iCloud event
            for (const icloudEvent of icloudEvents) {
                try {
                    await this.processSingleEvent(icloudEvent, existingSyncMap, result);
                } catch (error) {
                    const errorMsg = `Failed to process event "${icloudEvent.summary}": ${error instanceof Error ? error.message : 'Unknown error'}`;
                    console.error(errorMsg);
                    result.errors.push(errorMsg);
                }
            }

            // Clean up deleted events
            await this.cleanupDeletedEvents(icloudEvents, existingSyncMap, result);

            console.log(`Sync completed: ${result.eventsCreated} created, ${result.eventsUpdated} updated, ${result.eventsDeleted} deleted`);

            if (result.errors.length > 0) {
                console.warn(`Sync completed with ${result.errors.length} errors`);
            }

        } catch (error) {
            const errorMsg = `Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
            console.error(errorMsg);
            result.errors.push(errorMsg);
        }

        return result;
    }

    /**
     * Process a single iCloud event
     */
    private async processSingleEvent(
        icloudEvent: CalendarEvent,
        existingSyncMap: Map<string, string>,
        result: SyncResult
    ): Promise<void> {
        const existingGoogleEventId = existingSyncMap.get(icloudEvent.uid);

        if (this.config.dryRun) {
            if (existingGoogleEventId) {
                console.log(`[DRY RUN] Would update: ${icloudEvent.summary}`);
            } else {
                console.log(`[DRY RUN] Would create: ${icloudEvent.summary}`);
            }
            return;
        }

        if (existingGoogleEventId) {
            // Update existing event
            await this.googleService.updateEvent(existingGoogleEventId, icloudEvent);
            result.eventsUpdated++;
            console.log(`Updated event: ${icloudEvent.summary}`);
        } else {
            // Create new event
            await this.googleService.createEvent(icloudEvent);
            result.eventsCreated++;
            console.log(`Created event: ${icloudEvent.summary}`);
        }
    }

    /**
     * Clean up events that were deleted from iCloud
     */
    private async cleanupDeletedEvents(
        icloudEvents: CalendarEvent[],
        existingSyncMap: Map<string, string>,
        result: SyncResult
    ): Promise<void> {
        const currentICloudUids = new Set(icloudEvents.map(event => event.uid));
        const deletedEvents: string[] = [];

        // Find Google Calendar events that no longer exist in iCloud
        for (const [icloudUid, googleEventId] of existingSyncMap.entries()) {
            if (!currentICloudUids.has(icloudUid)) {
                deletedEvents.push(googleEventId);
            }
        }

        if (deletedEvents.length === 0) {
            return;
        }

        console.log(`Found ${deletedEvents.length} events to delete from Google Calendar`);

        for (const googleEventId of deletedEvents) {
            try {
                if (this.config.dryRun) {
                    console.log(`[DRY RUN] Would delete Google Calendar event: ${googleEventId}`);
                } else {
                    await this.googleService.deleteEvent(googleEventId);
                    result.eventsDeleted++;
                    console.log(`Deleted event: ${googleEventId}`);
                }
            } catch (error) {
                const errorMsg = `Failed to delete event ${googleEventId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
                console.error(errorMsg);
                result.errors.push(errorMsg);
            }
        }
    }

    /**
     * Test both calendar connections
     */
    async testConnections(): Promise<void> {
        console.log('Testing calendar connections...');

        try {
            await Promise.all([
                this.icloudService.testConnection(),
                this.googleService.testConnection()
            ]);

            console.log('All calendar connections tested successfully');
        } catch (error) {
            console.error('Calendar connection test failed:', error);
            throw error;
        }
    }

    /**
     * Get sync statistics without performing actual sync
     */
    async getSyncPreview(): Promise<{ icloudEvents: number; googleEvents: number; syncWindow: string }> {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + this.config.syncWindowDays);

        try {
            const [icloudEvents, existingSyncMap] = await Promise.all([
                this.icloudService.getEvents(startDate, endDate),
                this.googleService.findSyncedEvents()
            ]);

            return {
                icloudEvents: icloudEvents.length,
                googleEvents: existingSyncMap.size,
                syncWindow: `${startDate.toDateString()} to ${endDate.toDateString()}`
            };
        } catch (error) {
            console.error('Failed to get sync preview:', error);
            throw error;
        }
    }
}