#!/bin/bash

echo "🧪 Testing Google Calendar Flow"

echo "1. Current authentication status:"
curl -s http://localhost:5000/api/auth/google/status | jq '.'

echo -e "\n2. Testing calendar list (should fail if not authenticated):"
curl -s http://localhost:5000/api/calendar/calendars | jq '.'

echo -e "\n3. Testing calendar sync (should fail if not authenticated):"
curl -s -X POST http://localhost:5000/api/calendar/sync | jq '.'

echo -e "\n4. Testing calendar events (should return empty array or error):"
curl -s "http://localhost:5000/api/calendar/events/hybrid?source=live" | jq '.'

echo -e "\n✅ Flow test complete. User needs to visit the OAuth URL to reconnect."