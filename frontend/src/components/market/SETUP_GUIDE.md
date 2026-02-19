# Market Dashboard Setup Guide

## Issue: "No price data available"

If you're seeing the error **"No price data available for wheat within 100.0km"**, it means the backend database doesn't have any market price data yet.

## Solution: Seed the Database

The backend includes a database seeding script that will populate sample market data for testing.

### Step 1: Run the Seeding Script

From the project root directory, run:

```bash
python scripts/seed_db.py
```

This will create:
- 3 sample users (in Delhi, Hyderabad, and Chennai)
- 4 market price records for different crops:
  - **Wheat** at Azadpur Mandi, Delhi (₹2,150/quintal)
  - **Cotton** at Kurnool Market, Andhra Pradesh (₹5,800/quintal)
  - **Rice** at Thanjavur Market, Tamil Nadu (₹1,950/quintal)
  - **Maize** at Warangal Market, Telangana (₹1,850/quintal)

### Step 2: Verify Data Was Added

You should see output like:
```
🌱 Seeding database with sample data...
✅ Successfully seeded database with:
   - 3 sample users
   - 3 notification preferences
   - 4 market price records
```

### Step 3: Test the Market Dashboard

1. Navigate to the Market page in the frontend
2. Enter a commodity: **wheat**, **cotton**, **rice**, or **maize**
3. The location field is optional (default coordinates are Delhi)
4. Click **Search**

You should now see:
- Current prices from nearby mandis
- Price trends chart
- Map with mandi locations
- Option to get selling recommendations

## Testing Different Locations

The sample data includes mandis in different locations:

| Commodity | Mandi | Location | Coordinates |
|-----------|-------|----------|-------------|
| Wheat | Azadpur Mandi | Delhi | 28.7041, 77.1025 |
| Cotton | Kurnool Market | Andhra Pradesh | 15.8281, 78.0373 |
| Rice | Thanjavur Market | Tamil Nadu | 10.7870, 79.1378 |
| Maize | Warangal Market | Telangana | 17.9689, 79.5941 |

To see different results, you can:
1. Change the default coordinates in `MarketDashboard.vue`
2. Implement geocoding to convert location names to coordinates
3. Use browser geolocation to get user's actual location

## Clearing Sample Data

If you need to clear the sample data and start fresh:

```bash
python scripts/seed_db.py --clear
```

## Adding More Market Data

To add more market data for testing, you can:

1. **Modify the seeding script** (`scripts/seed_db.py`):
   - Add more entries to the `market_data` array
   - Include different crops, mandis, and locations

2. **Use the backend API directly**:
   - The market data is stored in the `market_prices` table
   - You can insert records directly via SQL or through the API

3. **Integrate with real data sources**:
   - The backend is designed to fetch data from AGMARKNET
   - Configure the external API integration in the backend

## Troubleshooting

### Error: "No module named 'app'"
Make sure you're running the script from the project root directory, not from the `scripts` folder.

### Error: "Database connection failed"
1. Ensure PostgreSQL is running
2. Check your database configuration in `.env`
3. Verify the database exists and is accessible

### Error: "Table does not exist"
Run database migrations first:
```bash
alembic upgrade head
```

### Still seeing "No price data available"
1. Check the backend logs to see if data was actually inserted
2. Verify the coordinates you're searching with match the sample data locations
3. Try increasing the search radius (default is 100km)
4. Check if the commodity name matches exactly (case-sensitive)

## Production Considerations

For production deployment:

1. **Real Data Integration**: 
   - Integrate with AGMARKNET or other official market data sources
   - Set up automated data synchronization

2. **Data Updates**:
   - Implement scheduled jobs to update prices daily
   - Add historical price tracking

3. **Location Services**:
   - Implement proper geocoding service
   - Add support for address-to-coordinates conversion
   - Use user's saved location from profile

4. **Caching**:
   - The backend already implements Redis caching
   - Configure appropriate cache TTL for market data

5. **Data Validation**:
   - Add data quality checks
   - Implement anomaly detection for price data
   - Set up alerts for missing or stale data
