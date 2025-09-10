# Google Calendar Connection Fix

## Quick Fix Steps

Your calendar is not connecting because the Google authentication has expired. Here's how to fix it:

### Option 1: Through the Application UI (Recommended)
1. Open your application at http://localhost:3000
2. Navigate to the Calendar page
3. You should see an error message or a "Connect Google Calendar" button
4. Click the button to re-authenticate
5. Sign in with your Google account
6. Grant permission to access your calendar
7. You'll be redirected back to the app with the calendar connected

### Option 2: Direct Authentication URL
Visit this URL in your browser while the app is running:
http://localhost:3000/api/auth/google

This will start the Google authentication flow directly.

### Option 3: Force Re-connection (if already connected but not working)
If the calendar shows as connected but isn't working properly:
http://localhost:3000/api/auth/google?force=true

## What Happens During Authentication

1. You'll be redirected to Google's sign-in page
2. Select the Google account with your calendar
3. Grant these permissions:
   - View your calendars
   - See and edit events on all your calendars
   - View files in your Google Drive

4. After approval, you'll be redirected back to your application
5. The calendar should now be connected and working

## Troubleshooting

If the calendar still doesn't work after re-authentication:

1. **Check your credentials**: Make sure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set in your environment
2. **Clear browser cache**: Sometimes old tokens can cause issues
3. **Check the logs**: Look at the browser console for any error messages
4. **Try force reconnection**: Use the force=true parameter in the URL

## Current Status

✅ **Working:**
- Application is running
- Database is connected
- AI services are integrated

❌ **Not Working:**
- Google Calendar connection (missing refresh token)

After following these steps, your calendar should be fully connected and functional!