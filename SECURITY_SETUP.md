# Security Setup for Illovo Pizza Manager

## Important: Firebase API Keys Are Safe in Public Code

**Good news**: Firebase web API keys are designed to be public and safe to expose in client-side code.

- The API key only identifies your Firebase project
- **Real security comes from Firestore Security Rules**, not hiding the API key
- Even with the API key, no one can access your data without proper Firestore rules

## Set Up Firestore Security Rules (Required)

### Step 1: Go to Firestore Rules

https://console.firebase.google.com/project/pizza-illovo-dashboard/firestore/rules

### Step 2: Copy and Publish These Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /orders/{orderId} {
      // Restrict to your GitHub Pages domain only
      allow read, write: if request.host.matches('logic06183\\.github\\.io');
    }
  }
}
```

This ensures only requests from your GitHub Pages site can access the data.

### Step 3: Click "Publish"

## Additional Security (Optional but Recommended)

### Add HTTP Referrer Restrictions

1. Go to: https://console.cloud.google.com/apis/credentials?project=pizza-illovo-dashboard
2. Click your API key
3. Under "Application restrictions" → "HTTP referrers"
4. Add: `logic06183.github.io/*`
5. Save

## Your Dashboard URL

Once deployed: https://logic06183.github.io/illovo-pizza-manager/

---

**Summary**: Your API key in the code is safe. Just make sure to set up the Firestore Security Rules above!
