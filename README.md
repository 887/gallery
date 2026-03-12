# Image Gallery & Slideshow

A full-featured web-based image gallery and slideshow application for organizing and classifying images.

## Features

### Gallery View
- **Grid Layout** - Browse all images in a responsive grid
- **Image Classification** - Quick G/B buttons to sort images into "Good" and "Bad" folders
- **Multiple Filters** - View All, Good, Bad categories
- **Shuffle** - Randomize image order
- **Click to Fullscreen** - Click any image to view in fullscreen mode

### Slideshow Mode
- **Keyboard & Scroll Navigation** - Use arrow keys, space, or scroll wheel to navigate
- **Proportional Scroll Mapping** - Scroll position maps to image index (zoom-aware)
- **Autoplay** - Play/pause/reverse controls with adjustable speed (0.1-20 img/s)
- **Fade Transitions** - Smooth fade effects with customizable duration (0.1-5s)
- **Progress Bar** - Visual indicator of slideshow progress
- **Auto-Hide Controls** - Controls hide after 2 seconds, show on mouse movement
- **Quick Classification** - G/B buttons in slideshow for fast image sorting
- **Dynamic Button Labels** - Buttons show destination folder (R=remove, G=good, B=bad)

### Fullscreen Viewer
- **Navigation Arrows** - Previous/next buttons for image navigation
- **Scroll Navigation** - Proportional scroll position maps to image index
- **Image Counter** - Current position displayed
- **Quick Buttons** - G/B classification buttons in fullscreen
- **Scroll Position Memory** - Returns to gallery scroll position when closing

### Settings & Persistence
- **Speed Control** - Adjustable slideshow playback speed (saved to localStorage)
- **Fade Duration** - Customize transition fade timing (saved to localStorage)
- **Responsive Design** - Works on desktop and tablet screens

### Meow Mode (Easter Egg)
- **Floating Text** - Customizable "MEOW!" animations
- **Animation Controls** - Frequency, count, slide-in duration, fade duration
- **Direction & Position** - Configurable spawning direction and screen position
- **Customizable Text** - Enter any text (CSV format for multiple options)

## Keyboard Shortcuts

### Gallery
| Key | Action |
|-----|--------|
| Space | Start slideshow |

### Slideshow & Fullscreen
| Key | Action |
|-----|--------|
| Space | Play/pause slideshow; next image in fullscreen |
| ← Arrow | Previous image/slide |
| → Arrow | Next image/slide |
| Esc | Close slideshow/fullscreen |
| Scroll | Navigate images (proportional to scroll position) |

### Mouse
| Button | Action |
|--------|--------|
| Middle Wheel | Scroll through slideshow/viewer (auto-detects Firefox autoscroll) |
| Click Image | Open in fullscreen viewer |

## Folders

- **`all/`** - View all images
- **`good/`** - Images marked as "good"
- **`bad/`** - Images marked as "bad"
- **`regular/`** - Default folder (same as `all/`)

## API Endpoints

### GET /api/list?folder=all
Returns array of image URLs in the specified folder.

### GET /api/counts
Returns count of images in each folder:
```json
{
  "all": 544,
  "good": 125,
  "bad": 89
}
```

### POST /api/move
Moves an image to a target folder.
```json
{
  "image": "filename.jpg",
  "target": "good" | "bad" | "regular"
}
```

## Image Format Support

Supports: JPG, PNG, GIF, WebP, BMP, SVG, TIFF, TIF, ICO, JXL, AVIF

## Server

Node.js HTTP server running on default port. Start with:
```bash
node server.js
```

Or use the provided start script:
```bash
./start.sh
```

## Performance Notes

- **Proportional Scroll Mapping** - Zoom levels are automatically compensated for
- **Efficient Re-rendering** - Gallery only re-renders when folder changes
- **Event Gating** - Click selections use 200ms ignore flag to prevent scroll override
- **Slideshow Animation** - Uses CSS transitions for smooth fade effects

## License

MIT
