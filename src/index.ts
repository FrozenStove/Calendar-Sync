import * as dotenv from "dotenv";
import { CalendarScheduler } from "./scheduler";
import { CalendarSyncConfig } from "./calendar-sync-service";

// Load environment variables
dotenv.config();

/**
 * Main application entry point
 */
async function main() {
  console.log('🚀 Starting Calendar Sync Service...');
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

  // Validate required environment variables
  validateEnvironment();

  // Create sync configuration
  const syncConfig: CalendarSyncConfig = {
    icloud: {
      username: process.env.ICLOUD_USERNAME!,
      appSpecificPassword: process.env.ICLOUD_APP_PASSWORD!,
      calendarUrl: process.env.ICLOUD_CALENDAR_URL,
      userFilter: process.env.USER_FILTER, // Filter events for specific user
    },
    google: {
      serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!,
      serviceAccountPrivateKey: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY!,
      calendarId: process.env.GOOGLE_CALENDAR_ID!,
      impersonateUser: process.env.GOOGLE_IMPERSONATE_USER,
    },
    syncWindowDays: parseInt(process.env.SYNC_WINDOW_DAYS || '30'),
    dryRun: process.env.DRY_RUN === 'true',
  };

  try {
    // Initialize the scheduler
    const scheduler = CalendarScheduler.getInstance();
    await scheduler.initialize(syncConfig);

    // Test connections
    console.log('🔗 Testing calendar connections...');
    await scheduler.testConnections();

    // Get sync preview
    console.log('📊 Getting sync preview...');
    const preview = await scheduler.getSyncPreview();
    console.log(`Preview: ${preview.icloudEvents} iCloud events, ${preview.googleEvents} existing synced events`);
    console.log(`Sync window: ${preview.syncWindow}`);

    // Run initial sync if not in dry run mode
    if (!syncConfig.dryRun) {
      console.log('🔄 Running initial sync...');
      await scheduler.runSyncNow();
    } else {
      console.log('🔍 Dry run mode - no changes will be made');
    }

    // Schedule weekly sync (Sundays at 2 AM by default)
    const cronSchedule = process.env.SYNC_SCHEDULE || "0 2 * * 0";
    scheduler.scheduleWeeklySync(cronSchedule);

    console.log('✅ Calendar sync service started successfully!');
    console.log('📅 Weekly sync scheduled');
    console.log('Press Ctrl+C to stop the service');

    // Graceful shutdown handling
    process.on('SIGINT', () => {
      console.log('\n🛑 Received SIGINT, shutting down gracefully...');
      scheduler.shutdown();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
      scheduler.shutdown();
      process.exit(0);
    });

    // Keep the process running
    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      scheduler.shutdown();
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
      scheduler.shutdown();
      process.exit(1);
    });

  } catch (error) {
    console.error('❌ Failed to start calendar sync service:', error);
    process.exit(1);
  }
}

/**
 * Validate required environment variables
 */
function validateEnvironment() {
  const required = [
    'ICLOUD_USERNAME',
    'ICLOUD_APP_PASSWORD',
    'GOOGLE_SERVICE_ACCOUNT_EMAIL',
    'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY',
    'GOOGLE_CALENDAR_ID'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(key => console.error(`  - ${key}`));
    console.error('\nPlease check your .env file or environment configuration.');
    process.exit(1);
  }

  console.log('✅ Environment variables validated');
}

// Start the application
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Application startup failed:', error);
    process.exit(1);
  });
}
