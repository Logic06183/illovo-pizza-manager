# John Dough's Illovo - Pizza Order Dashboard

A real-time pizza order management dashboard for John Dough's Illovo Pizzeria, built with Firebase Firestore.

## Features

- **Real-time Order Tracking**: Live updates as orders come in from Uber Eats, Mr D Food, and other platforms
- **Order Management**: Update order status (Preparing → Ready → Completed)
- **Staff Notes**: Add internal notes to orders
- **Smart Filtering**: Search and filter by customer, platform, status, or special requirements
- **Daily Statistics**: Track orders, revenue, pizza types, and ingredient usage
- **Monthly Analytics**: Comprehensive monthly reports with charts and visualizations
- **Mobile-Optimized**: Perfect for kitchen tablets and smartphones

## Quick Start

### View Live Dashboard

The dashboard is deployed at: `https://YOUR-GITHUB-USERNAME.github.io/illovo-pizza-manager/`

### Local Testing

1. Open `index.html` in your web browser
2. The app will connect to your Firebase project automatically
3. Use browser DevTools mobile view for mobile testing

## Deployment to GitHub Pages

### Initial Setup

1. Create a new GitHub repository called `illovo-pizza-manager`

2. Initialize git and push the code:
```bash
git init
git add .
git commit -m "Initial commit: John Dough's Illovo pizza manager"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/illovo-pizza-manager.git
git push -u origin main
```

3. Enable GitHub Pages:
   - Go to repository Settings → Pages
   - Source: Deploy from branch `main`
   - Folder: `/ (root)`
   - Click Save

4. Your dashboard will be live at: `https://YOUR-USERNAME.github.io/illovo-pizza-manager/`

### Updating the Dashboard

To deploy updates:
```bash
git add .
git commit -m "Description of your changes"
git push
```

GitHub Pages will automatically rebuild and deploy within 1-2 minutes.

## Firebase Setup

### Firestore Database Structure

Your orders collection should contain documents with this structure:

```javascript
{
  customerName: "John Smith",
  platform: "Uber Eats",  // or "Mr D Food", "Window", "Customer Pickup"
  status: "preparing",     // or "pending", "ready", "done", "delivered", "cancelled"
  totalAmount: 245.50,
  prepTimeMinutes: 30,
  hasSpecialInstructions: true,
  specialInstructions: "Extra crispy",
  orderTime: Timestamp,
  dueTime: Timestamp,
  pizzas: [
    {
      pizzaType: "The Champ Pizza",
      quantity: 2,
      totalPrice: 220.00,
      specialInstructions: "No onions",
      toppings: ["Extra cheese", "Extra pepperoni"]
    }
  ],
  staffNotes: [
    {
      content: "Customer called to confirm address",
      author: "Staff",
      timestamp: Timestamp
    }
  ],
  completed: false
}
```

### Security Rules

Update your Firestore security rules to allow read/write access:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /orders/{orderId} {
      // Allow read from GitHub Pages domain
      allow read: if request.auth != null || 
                     request.host.matches('.*\\.github\\.io');
      
      // Allow write from authenticated users or GitHub Pages
      allow write: if request.auth != null || 
                      request.host.matches('.*\\.github\\.io');
    }
  }
}
```

**Note**: For production, implement proper authentication instead of domain-based rules.

## Pizza Menu & Ingredients

The dashboard tracks these pizzas:
- The Champ Pizza (Pepperoni, Spring Onions, Parmesan)
- Pig in Paradise (Bacon, Caramelised Pineapple)
- Margie Pizza (Fresh & Shredded Mozzarella, Basil)
- Mushroom Cloud Pizza (Mushrooms, Goat's Cheese, Sunflower Seeds)
- Spud Pizza (Potato, Rosemary, Caramelised Onion)
- Mish-Mash Pizza (Parma Ham, Fig Preserve, Goat's Cheese, Rocket)
- Lekker'izza (Bacon, Chorizo, Peppadews)
- Vegan Harvest Pizza
- Poppa's Pizza
- The Zesty Zucchini
- Chick Tick Boom
- Artichoke & Ham

Ingredient quantities are pre-configured for inventory tracking.

## Customization

### Update Pizza Menu

Edit the `pizzaIngredients` object in `app.js` (around line 114):

```javascript
const pizzaIngredients = {
    "Your Pizza Name": [
        {name: "ingredient", amount: 100, unit: "g"},
        {name: "another ingredient", amount: 50, unit: "ml"}
    ]
};
```

### Change Colors

Edit CSS variables in `styles.css`:

```css
:root {
    --primary-color: #cc0000;  /* Main red color */
    --success-color: #28a745;
    --warning-color: #ffc107;
}
```

## Tech Stack

- **Frontend**: Vanilla JavaScript (no framework required)
- **Database**: Firebase Firestore (v9 compatibility SDK)
- **Charts**: Chart.js
- **Icons**: Material Icons
- **Hosting**: GitHub Pages (or Firebase Hosting)

## Browser Support

- Chrome/Edge (recommended)
- Safari
- Firefox
- Mobile browsers (iOS Safari, Chrome Android)

## Troubleshooting

### Orders not appearing?

1. Check browser console for errors
2. Verify Firebase config in `app.js` lines 23-30
3. Check Firestore security rules
4. Ensure orders collection exists with data

### Real-time updates not working?

- Toggle "Live Updates" switch off and on
- Check network connectivity
- Verify Firestore permissions

### Charts not displaying?

- Ensure internet connection (Chart.js loads from CDN)
- Check browser console for loading errors

## Support

For issues or questions about the dashboard, check:
- Firebase Console: https://console.firebase.google.com/project/pizza-illovo-dashboard
- Browser DevTools Console for error messages
- Network tab to verify Firebase connectivity

## License

Built for John Dough's Illovo Pizzeria
