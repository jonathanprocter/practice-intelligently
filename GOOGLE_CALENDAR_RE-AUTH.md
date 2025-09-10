# Google Calendar Re-Authentication Guide

## Current Status
The Google Calendar OAuth tokens have expired and the refresh token is invalid. This requires manual re-authentication.

## Why Re-Authentication is Needed

The OAuth refresh token became invalid due to one of these reasons:
1. **Token Expiry**: Refresh tokens expire after 6 months of inactivity
2. **Credential Change**: The OAuth app credentials (Client ID/Secret) have changed  
3. **Revoked Access**: Google OAuth consent was revoked manually

## How to Re-Authenticate

### Step 1: Access the Re-Authentication Page
Navigate to: `/reauth-google` in your application

### Step 2: Start OAuth Flow
1. Click on **"Connect Google Calendar"** button
2. You'll be redirected to Google's secure login page
3. Sign in with your Google account (the one with calendar access)
4. Review and accept the permissions:
   - View your calendars
   - View and edit events on all your calendars
   - View files in your Google Drive

### Step 3: Complete Authentication
After granting permissions, you'll be redirected back to the application and:
- New OAuth tokens will be saved automatically
- Calendar sync will resume immediately
- The authentication status will show as "Connected"

## Alternative Method: Direct API Authentication

If the UI method doesn't work, you can authenticate directly:

1. Visit: `/api/auth/google` in your browser
2. Complete the Google OAuth flow
3. Check status at: `/api/auth/google/status`

## Troubleshooting

### "Invalid Client" Error
This means the OAuth app credentials are incorrect. Check that:
- `GOOGLE_CLIENT_ID` environment variable is set correctly
- `GOOGLE_CLIENT_SECRET` environment variable is set correctly
- The redirect URI in Google Console matches your application URL

### "Invalid Grant" Error  
The refresh token has expired. You must re-authenticate following the steps above.

### Connection Test Failed
After re-authentication, if calendar sync still doesn't work:
1. Clear browser cache and cookies
2. Try disconnecting (`/api/auth/google/disconnect`) and reconnecting
3. Check that calendar permissions are enabled in your Google account settings

## Verification

After successful re-authentication:
1. Check connection status at `/api/auth/google/status`
2. Verify calendar sync is working by checking the calendar page
3. New tokens will be saved in `.oauth-tokens.json` (server-side)

## Security Notes

- OAuth tokens are stored securely on the server
- Tokens are never exposed to the client/browser
- Refresh tokens are used to automatically renew access
- You can disconnect at any time via the re-auth page

## Need Help?

If you continue to have issues:
1. Check the server logs for specific error messages
2. Verify Google Calendar API is enabled in Google Cloud Console
3. Ensure the OAuth consent screen is configured properly
4. Check that the redirect URI matches exactly (including protocol)

---
Last Updated: September 10, 2025