// Script to check the structure of pizza order data
// Firebase configuration (same as in your app.js)
const firebaseConfig = {
    apiKey: "AIzaSyDiLgj4OV4IzSZLpITk3j1WRnR6s37MMX0",
    authDomain: "pizza-dashboard-92057.firebaseapp.com",
    projectId: "pizza-dashboard-92057",
    storageBucket: "pizza-dashboard-92057.appspot.com",
    messagingSenderId: "383624156428",
    appId: "1:383624156428:web:e37a6b4a302b5ae1fa6c17"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Get a reference to the orders collection
const ordersRef = db.collection('orders');

// Function to log the structure of a document
function logDocumentStructure(doc) {
    console.log('Order ID:', doc.id);
    const data = doc.data();
    console.log('Full document data:', JSON.stringify(data, null, 2));
    
    // Check specifically for pizza data
    if (data.pizzas) {
        console.log('Pizza array structure:');
        data.pizzas.forEach((pizza, index) => {
            console.log(`Pizza ${index + 1}:`, JSON.stringify(pizza, null, 2));
            console.log('Pizza name property:', pizza.name);
            console.log('Available pizza properties:', Object.keys(pizza).join(', '));
        });
    } else {
        console.log('No pizzas array found in the document');
        // Check for alternative pizza data structures
        console.log('All top-level properties:', Object.keys(data).join(', '));
    }
}

// Get the most recent order
ordersRef.orderBy('orderTime', 'desc').limit(1)
    .get()
    .then((querySnapshot) => {
        if (querySnapshot.empty) {
            console.log('No orders found');
            return;
        }
        
        console.log('Found the most recent order. Checking structure...');
        querySnapshot.forEach(logDocumentStructure);
    })
    .catch((error) => {
        console.error('Error fetching orders:', error);
    });

// Add an output element to show the results
document.addEventListener('DOMContentLoaded', () => {
    const outputDiv = document.createElement('div');
    outputDiv.id = 'structure-output';
    outputDiv.style.padding = '20px';
    outputDiv.style.backgroundColor = '#f5f5f5';
    outputDiv.style.borderRadius = '8px';
    outputDiv.style.margin = '20px';
    outputDiv.style.fontFamily = 'monospace';
    outputDiv.style.whiteSpace = 'pre-wrap';
    outputDiv.innerHTML = 'Loading database structure...';
    document.body.appendChild(outputDiv);
    
    // Override console.log to also output to our div
    const originalLog = console.log;
    console.log = function() {
        const args = Array.from(arguments);
        originalLog.apply(console, args);
        
        const output = document.getElementById('structure-output');
        if (output) {
            output.innerHTML += args.map(arg => 
                typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
            ).join(' ') + '<br>';
        }
    };
});
