# Walk to Mordor

A Lord of the Rings themed walking tracker that visualizes your journey from Hobbiton to Mount Doom on an interactive Middle-earth map.

## Features

- Interactive map with zoom and pan controls
- Animated journey path showing progress
- Landmark waypoints with descriptions from the books
- Toggle between different walkers (Joely/Kylie)
- Real-time data from Google Sheets
- Progress persists between sessions

## Setup

### Google Sheets Integration

1. Create a Google Sheet with your walking data (or use the Walk to Mordor challenge spreadsheet)
2. Make the sheet publicly viewable (Share > Anyone with the link)
3. Find your sheet's gid:
   - Open the sheet tab you want to track
   - Look at the URL: `...spreadsheets/d/{SHEET_ID}/edit#gid={GID}`
4. Update `js/sheets.js` with your Sheet ID and gid values

### Local Development

Just open `index.html` in a browser - no build step required.

### Deploy to GitHub Pages

1. Push to GitHub
2. Go to Settings > Pages
3. Select "Deploy from branch" > main > / (root)
4. Your site will be live at `https://{username}.github.io/{repo}/`

## Configuration

Edit `js/sheets.js` to configure:

```javascript
SHEET_ID: 'your-google-sheet-id',
walkerConfigs: {
    joely: { name: 'Joely', gid: 'sheet-tab-gid' },
    kylie: { name: 'Kylie', gid: 'sheet-tab-gid' },
}
```

## The Journey

The route follows the path from the books:

1. **Hobbiton** (0 mi) - Where the journey begins
2. **Bree** (135 mi) - The Prancing Pony
3. **Weathertop** (240 mi) - Frodo's encounter with the Nazgul
4. **Rivendell** (458 mi) - The Last Homely House
5. **Moria** (798 mi) - Through the Mines
6. **Lothlorien** (920 mi) - The Golden Wood
7. **Argonath** (1,309 mi) - The Pillars of the Kings
8. **Dead Marshes** (1,433 mi) - The haunted marshland
9. **Black Gate** (1,474 mi) - The Morannon
10. **Cirith Ungol** (1,634 mi) - The Pass of the Spider
11. **Mount Doom** (1,800 mi) - Journey's end

## Credits

Map image and route data based on Tolkien's Middle-earth.

*"Not all those who wander are lost."* - J.R.R. Tolkien
