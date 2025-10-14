# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a mobile-first pizza dashboard for John Dough's Illovo Pizzeria that connects to Firebase Firestore to display real-time pizza orders. The application is designed for deployment to GitHub Pages and provides live order monitoring, detailed statistics, and ingredients tracking.

## Technology Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Database**: Firebase Firestore (v9 compatibility mode)
- **Visualization**: Chart.js for statistics
- **Styling**: CSS Grid/Flexbox, Material Icons
- **Deployment**: GitHub Pages ready (static files only)

## File Structure

- `index.html` - Main application page with order management interface
- `app.js` - Core application logic, Firebase integration, and order processing
- `styles.css` - Primary application styling with responsive design
- `stats-styles.css` - Additional styles specifically for statistics pages
- `check-data.html` + `check-firebase-data.js` - Debug utilities for Firebase data inspection

## Key Architecture Components

### Firebase Configuration
- Uses Firebase v9 compatibility mode for broader browser support
- Configuration located in `app.js` lines 23-30
- Firestore collection: `orders`
- Real-time listeners available for live updates

### Order Data Structure
Orders in Firestore contain:
- `customerName`, `platform`, `status`, `totalAmount`
- `orderTime`, `dueTime`, `prepTimeMinutes`
- `pizzas[]` array with `pizzaType`, `quantity`, `toppings[]`, `specialInstructions`
- `specialInstructions` (order-level), `completed`, `cooked[]`

### Pizza Ingredients System
- Complete ingredient mapping for John Dough's pizza recipes in `app.js` lines 114-208
- Each pizza type has defined ingredients with amounts and units
- Used for calculating daily/monthly ingredient usage statistics
- Supports quantity-based scaling for multiple pizzas

### Statistics Features
- **Daily Stats**: Orders, revenue, pizza types, ingredients usage with visualizations
- **Monthly Stats**: Comparative monthly analysis with charts and tables
- **Hourly Distribution**: Order patterns throughout the day
- **Platform Analytics**: Order source breakdown (Uber Eats, Mr D Food, etc.)

### UI Components
- **Expandable Order Cards**: Click to show/hide detailed information
- **Tab Navigation**: Filter orders by status (All, Preparing, Ready, Completed)
- **Real-time Toggle**: Switch between manual refresh and live updates
- **Responsive Design**: Mobile-first with tablet/desktop optimizations

## Development Workflow

### Making Changes
- Test locally by opening `index.html` in browser
- Use browser dev tools mobile view for mobile testing
- Check `check-data.html` for Firebase data structure debugging

### Firebase Security Rules
- Ensure Firestore rules allow read access from deployment domain
- For GitHub Pages: allow `*.github.io` domains

### Adding New Pizza Types
1. Add pizza definition to `pizzaIngredients` object in `app.js`
2. Include ingredient amounts per pizza with units
3. Test with sample orders to verify ingredient calculations

### Styling Modifications
- Primary colors and theme in CSS custom properties (`:root`)
- Platform-specific styling in `.platform-tag` classes
- Status-based styling using `.status-badge` classes
- Chart styling managed through Chart.js configuration

### Statistics Customization
- Modify chart types and data in `displayStatistics()` and `displayMonthlyStatistics()` functions
- Add new metrics by extending data collection loops in statistics functions
- Chart.js configurations embedded in JavaScript template literals

## Deployment Notes

- All files are static - no build process required
- Firebase config must be updated for production domain
- Charts load from CDN - ensure internet connectivity for full functionality
- Mobile-optimized for restaurant/kitchen environments