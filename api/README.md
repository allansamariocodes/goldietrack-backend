# GoldieTrack Backend

Serverless API for fetching gold and silver prices with automatic updates.

## Features
- Automatic price updates at 5 PM and 11:30 PM IST
- Caches prices in Redis
- Unlimited API calls from users
- 100% free infrastructure

## Endpoints

### GET /api/prices
Returns current cached prices.

**Response:**
```json
{
  "success": true,
  "prices": {
    "goldInrPerGram": 6543.21,
    "silverInrPerGram": 82.45
  },
  "lastUpdated": "2025-10-04T11:30:00.000Z",
  "nextUpdate": "2025-10-04T18:00:00.000Z"
}