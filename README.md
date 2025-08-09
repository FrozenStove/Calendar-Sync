# Calendar Sync Service

A Node.js TypeScript application that syncs calendar events from iCloud to Google Calendar, filtering events for a specific user. The service runs as a Docker container and automatically syncs on a configurable schedule.

## Features

- 🔄 **Automatic Sync**: Syncs iCloud calendar events to Google Calendar
- 👤 **User Filtering**: Only syncs events that contain a specific user's name/email
- 🚫 **Duplicate Prevention**: Tracks synced events to prevent duplicates
- ⏰ **Scheduled Sync**: Configurable cron schedule (default: weekly)
- 🐳 **Docker Ready**: Easy deployment with Docker and docker-compose
- 🔒 **Secure**: Uses app-specific passwords and service accounts
- 📊 **Monitoring**: Health checks and detailed logging
- 🧪 **Dry Run Mode**: Test sync without making changes

## Problem Solved

This application addresses the specific need to:
1. Read events from a shared iCloud calendar that shows everyone's schedule
2. Filter and sync only events relevant to a specific user
3. Create corresponding events in a personal Google Calendar
4. Run periodically without manual intervention
5. Handle authentication securely in a server environment

## Prerequisites

### iCloud Setup

1. **Apple ID with Calendar Access**: You need access to the iCloud calendar containing the team schedule
2. **App-Specific Password**: 
   - Go to [Apple ID Account Management](https://appleid.apple.com/account/manage)
   - Sign in with your Apple ID
   - Navigate to "Sign-In and Security" → "App-Specific Passwords"
   - Generate a new password for "Calendar Sync"
   - ⚠️ **Important**: Use this app-specific password, NOT your regular Apple ID password

### Google Calendar Setup

1. **Google Cloud Project**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable the Google Calendar API

2. **Service Account**:
   - Go to "IAM & Admin" → "Service Accounts"
   - Click "Create Service Account"
   - Name it "calendar-sync" (or similar)
   - Download the JSON key file
   - Extract the `client_email` and `private_key` from the JSON

3. **Calendar Sharing**:
   - Open Google Calendar
   - Find the calendar you want to sync to
   - Go to calendar settings → "Share with specific people"
   - Add the service account email with "Make changes to events" permission

## Installation

### Option 1: Docker Compose (Recommended)

1. **Clone and Setup**:
   ```bash
   git clone <repository-url>
   cd Calendar-Sync
   ```

2. **Configure Environment**:
   ```bash
   cp env.template .env
   # Edit .env with your actual credentials (see Configuration section)
   ```

3. **Run with Docker Compose**:
   ```bash
   docker-compose up -d
   ```

4. **View Logs**:
   ```bash
   docker-compose logs -f calendar-sync
   ```

### Option 2: Docker

1. **Build Image**:
   ```bash
   docker build -t calendar-sync .
   ```

2. **Run Container**:
   ```bash
   docker run -d --name calendar-sync --env-file .env calendar-sync
   ```

### Option 3: Local Development

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment**:
   ```bash
   cp env.template .env
   # Edit .env with your credentials
   ```

3. **Run in Development**:
   ```bash
   npm run dev
   ```

4. **Build and Run Production**:
   ```bash
   npm run build
   npm start
   ```

## Configuration

Edit the `.env` file with your credentials:

```bash
# Application Settings
NODE_ENV=production
DRY_RUN=false                    # Set to true for testing
SYNC_WINDOW_DAYS=30              # Days ahead to sync
SYNC_SCHEDULE="0 2 * * 0"        # Cron: Sundays at 2 AM

# iCloud Settings
ICLOUD_USERNAME=your-apple-id@example.com
ICLOUD_APP_PASSWORD=your-app-specific-password
USER_FILTER=Your Name            # Filter events containing this text

# Google Calendar Settings
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END PRIVATE KEY-----"
GOOGLE_CALENDAR_ID=primary       # Or specific calendar ID
```

### Configuration Options

| Variable | Description | Example |
|----------|-------------|---------|
| `USER_FILTER` | Text to search for in events (name, email, keyword) | `"John Doe"` or `"john@company.com"` |
| `SYNC_WINDOW_DAYS` | How many days ahead to sync | `30` (sync next 30 days) |
| `SYNC_SCHEDULE` | Cron expression for sync frequency | `"0 2 * * 0"` (Sundays at 2 AM) |
| `DRY_RUN` | Test mode - logs actions without making changes | `true` or `false` |

## Usage

### Automatic Operation

Once configured and running, the service will:

1. **Initialize**: Test connections to both calendars
2. **Initial Sync**: Perform first sync of events
3. **Schedule**: Set up recurring sync based on `SYNC_SCHEDULE`
4. **Monitor**: Run health checks and log activities

### Manual Operations

**Test Connections**:
```bash
# View logs to see connection test results
docker-compose logs calendar-sync | grep "Testing"
```

**Trigger Manual Sync**:
```bash
# Restart the container to trigger immediate sync
docker-compose restart calendar-sync
```

**Dry Run Test**:
```bash
# Set DRY_RUN=true in .env and restart
# This will show what would be synced without making changes
```

## How It Works

### Authentication

1. **iCloud**: Uses CalDAV protocol with app-specific password
2. **Google**: Uses Service Account with JWT authentication
3. **Security**: No passwords stored in code, uses environment variables

### Sync Process

1. **Fetch**: Gets events from iCloud calendar within sync window
2. **Filter**: Keeps only events containing the user filter text
3. **Compare**: Checks against existing synced events in Google Calendar
4. **Sync**: Creates new events, updates changed events, deletes removed events
5. **Track**: Maintains mapping between iCloud and Google events to prevent duplicates

### Event Filtering

Events are included if they contain the `USER_FILTER` text in:
- Event title/summary
- Event description
- Event location

Example: If `USER_FILTER="John Doe"`, these events would be synced:
- ✅ "Meeting with John Doe - Conference Room A"
- ✅ "Team Standup (John Doe, Jane Smith)"
- ✅ "Project Review" (description: "Attendees: John Doe, Bob Wilson")
- ❌ "All Hands Meeting" (no mention of John Doe)

## Monitoring

### Health Checks

The application includes built-in health checks:
- Docker health check every 60 seconds
- Connection tests on startup
- Detailed logging of sync operations

### Logs

**View Live Logs**:
```bash
docker-compose logs -f calendar-sync
```

**Log Levels**:
- ✅ **Info**: Normal operations, sync results
- ⚠️ **Warning**: Non-critical issues, parsing failures
- ❌ **Error**: Critical failures, authentication issues

### Sync Results

Each sync operation logs:
- Number of events processed
- Events created, updated, deleted
- Any errors encountered
- Execution time

## Troubleshooting

### Common Issues

**iCloud Authentication Failed**:
- Verify Apple ID username is correct
- Ensure you're using an app-specific password, not your regular password
- Check if two-factor authentication is enabled (required)

**Google Calendar Access Denied**:
- Verify service account email is correct
- Ensure the calendar is shared with the service account
- Check that Calendar API is enabled in Google Cloud Console

**No Events Synced**:
- Check the `USER_FILTER` setting - it might be too restrictive
- Verify the `SYNC_WINDOW_DAYS` covers the period you want
- Look for events in the iCloud calendar that match your filter

**Duplicate Events**:
- The service prevents duplicates automatically
- If you see duplicates, check for multiple instances running
- Clear existing synced events and restart if needed

### Debug Mode

Enable detailed logging:

```bash
# Add to .env
DRY_RUN=true
NODE_ENV=development
```

This will:
- Show what would be synced without making changes
- Provide more detailed logging
- Help identify filtering and authentication issues

### Connection Testing

Test individual components:

```bash
# Test iCloud connection
# Check logs for "Successfully connected to iCloud CalDAV"

# Test Google Calendar connection  
# Check logs for "Successfully connected to Google Calendar"

# Test sync preview
# Check logs for event counts and sync window information
```

## Security Considerations

### Credentials Management

- ✅ Use app-specific passwords for iCloud (never regular passwords)
- ✅ Rotate service account keys regularly
- ✅ Use environment variables (never hardcode credentials)
- ✅ Limit service account permissions to Calendar API only
- ✅ Consider using secret management systems in production

### Container Security

- ✅ Runs as non-root user (UID 1001)
- ✅ Uses Alpine Linux base images
- ✅ Regular security updates
- ✅ Resource limits configured
- ✅ No unnecessary ports exposed

### Network Security

- ✅ All API calls use HTTPS
- ✅ No inbound network connections required
- ✅ Can run in isolated networks

## Development

### Project Structure

```
src/
├── index.ts                    # Main application entry point
├── calendar-sync-service.ts    # Core sync logic
├── google-calendar-service.ts  # Google Calendar API wrapper
├── caldav-service.ts          # iCloud CalDAV service
├── scheduler.ts               # Cron scheduling
└── calendar.ts                # Event data models
```

### Building

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run built application
npm start

# Development mode with auto-reload
npm run dev
```

### Testing

```bash
# Test with dry run mode
DRY_RUN=true npm run dev

# Test connections only
# Check application logs for connection test results
```

## License

[MIT License](LICENSE)

## Support

For issues and questions:

1. Check the troubleshooting section above
2. Review application logs for specific error messages
3. Verify all environment variables are set correctly
4. Test individual components (iCloud, Google Calendar) separately

## Changelog

### Version 2.0.0
- Complete rewrite in TypeScript
- Added Google Calendar API integration
- Implemented user-specific event filtering
- Added duplicate prevention
- Enhanced security with service accounts
- Added comprehensive logging and monitoring
- Docker optimization for production deployment