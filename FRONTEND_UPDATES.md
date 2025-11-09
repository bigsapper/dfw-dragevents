# Frontend Updates - Date Range Display

## Summary
Updated the event display pages to show start and end dates with intelligent date range formatting.

## Changes Made

### JavaScript (`site/assets/js/app.js`)

#### New Function: `formatDateRange(startDate, endDate)`
Intelligently formats date ranges:
- **Single-day events**: Shows single date (e.g., "Fri, Nov 15, 2025")
- **Multi-day events**: Shows date range (e.g., "Nov 15 - Nov 17, 2025")
- **No end date**: Falls back to single date display
- **Invalid dates**: Shows "Date TBA"

#### Updated Functions:
- `loadEventsList()`: Now uses `formatDateRange()` instead of `formatDateTime()`
- `loadEventDetail()`: Now uses `formatDateRange()` for date display

### HTML (`site/event.html`)

#### Event Detail Page Updates:
- Changed label from "Time:" to "Date:" for clarity
- Added `<strong>` tags to labels (Track, Date, Fees) for better visual hierarchy

## Examples

### Single-Day Event
```
Date: Fri, Nov 15, 2025
```

### Multi-Day Event
```
Date: Nov 15 - Nov 17, 2025
```

### Event List Card
```
┌─────────────────────────────────┐
│ Fall Nationals                  │
│ Texas Motorplex                 │
│ NHRA fall event                 │
│ Nov 15 - Nov 17, 2025          │
│ [Details]                       │
└─────────────────────────────────┘
```

## Testing

To test the changes:
1. Export the data: `cd tools && make export`
2. Start a local server: `cd ../site && python -m http.server 8000`
3. Open http://localhost:8000
4. Verify:
   - Events list page shows date ranges
   - Event detail page shows date ranges
   - Single-day events show single date
   - Multi-day events show date range

## Browser Compatibility

The date formatting uses standard JavaScript `Date` and `toLocaleDateString()` which are supported in all modern browsers:
- Chrome/Edge: ✓
- Firefox: ✓
- Safari: ✓
- Mobile browsers: ✓
