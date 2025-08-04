
# Calendar Events Verification Checklist

## Backend Verification:
1. Check server logs for "Calendar fetch params" showing 2015-2030 dates
2. Verify `/api/oauth/events/today` endpoint returns all historical events
3. Confirm Simple Practice calendar (79dfcb90ce59b1b0345b24f5c8d342bd308eac9521d063a684a8bbd377f2b822@group.calendar.google.com) is fetching broad date range

## Frontend Verification:
1. Console should show "Successfully loaded X events from Simple Practice calendar" with high number
2. Weekly calendar view should display events across different weeks/months
3. No more "Events for current week: 0" when historical data exists

## Expected Results:
- Backend logs should show timeMin=2015-01-01T00:00:00.000Z, timeMax=2030-12-31T23:59:59.999Z
- Frontend should receive and display over 4,000 events as mentioned by user
- Weekly view should show events when navigating to different weeks

## If Still Not Working:
1. Hard refresh browser (Ctrl+F5 / Cmd+Shift+R)
2. Clear browser cache completely
3. Check React Query devtools for cached queries
4. Verify Google Calendar API hasn't hit rate limits
