// Debug logger function
function debugLog(message, type = 'info') {
    const debugConsole = document.getElementById('debugConsole');
    if (!debugConsole) return;
    
    const line = document.createElement('div');
    line.className = `debug-line debug-${type}`;
    const timestamp = new Date().toLocaleTimeString();
    line.textContent = `[${timestamp}] ${message}`;
    
    debugConsole.appendChild(line);
    debugConsole.scrollTop = debugConsole.scrollHeight;
    
    // Also log to browser console
    if (type === 'error') {
        console.error(message);
    } else {
        console.log(message);
    }
}

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBwGLDblddpEVGMH_W-Y4a_jButmZFK-dg",
    authDomain: "pizza-illovo-dashboard.firebaseapp.com",
    projectId: "pizza-illovo-dashboard",
    storageBucket: "pizza-illovo-dashboard.firebasestorage.app",
    messagingSenderId: "726078177684",
    appId: "1:726078177684:web:59952976c7f2b86daa4f81"
};

// Initialize Firebase with enhanced error handling and debugging
let db;
let firebaseInitialized = false;

debugLog('Starting Firebase initialization...');

// Check if Firebase SDK is loaded
if (typeof firebase === 'undefined') {
    debugLog('Firebase SDK not loaded! Check network connectivity and script tags.', 'error');
    showErrorState('firebaseNotLoaded');
} else {
    debugLog('Firebase SDK detected, attempting to initialize...');
    try {
        // Initialize Firebase
        firebase.initializeApp(firebaseConfig);
        debugLog('Firebase app initialized successfully');
        
        // Check if Firestore is available
        if (typeof firebase.firestore === 'undefined') {
            debugLog('Firestore module not available!', 'error');
            throw new Error('Firestore module not loaded');
        }
        
        // Initialize Firestore
        db = firebase.firestore();
        debugLog('Firestore initialized');
        
        // Add settings for better cross-domain support
        db.settings({
            ignoreUndefinedProperties: true,
            cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
        });
        debugLog('Firestore settings applied');
        
        // Test the connection with a simple query
        db.collection('orders').limit(1).get()
            .then(snapshot => {
                debugLog(`Firestore test query successful: ${snapshot.size} docs returned`);
                firebaseInitialized = true;
            })
            .catch(error => {
                debugLog(`Firestore test query failed: ${error.message}`, 'error');
                if (error.code === 'permission-denied') {
                    showErrorState('permissionDenied');
                } else {
                    showErrorState('networkError', { message: error.message });
                }
            });
    } catch (error) {
        debugLog(`Firebase initialization error: ${error.message}`, 'error');
        showErrorState('default', { message: `Firebase initialization failed: ${error.message}` });
    }
}

// DOM Elements
const ordersContainer = document.getElementById('ordersContainer');
const refreshButton = document.getElementById('refreshButton');
const realtimeToggle = document.getElementById('realtimeToggle');
const tabButtons = document.querySelectorAll('.tab-btn');
const lastUpdatedElement = document.getElementById('lastUpdated');

// App State
let currentTab = 'all';
let unsubscribe = null;
let orders = [];
let searchQuery = '';
let quickFilter = 'all';

// Pizza ingredients mapping for John Dough's pizzas with quantities per pizza
// Synced with Linden ingredients.js — confirmed April 2026
const pizzaIngredients = {
    "The Champ Pizza": [
        {name: "pepperoni", amount: 74, unit: "g"},
        {name: "red onion", amount: 8, unit: "g"},
        {name: "parmesan", amount: 8, unit: "g"},
        {name: "shredded mozzarella", amount: 94, unit: "g"},
        {name: "pizza sauce", amount: 60, unit: "ml"}
    ],
    "Pig in Paradise": [
        {name: "bacon", amount: 64, unit: "g"},
        {name: "caramelised pineapple", amount: 130, unit: "g"},
        {name: "shredded mozzarella", amount: 94, unit: "g"},
        {name: "pizza sauce", amount: 60, unit: "ml"}
    ],
    "Margie Pizza": [
        {name: "shredded mozzarella", amount: 94, unit: "g"},
        {name: "fresh mozzarella", amount: 80, unit: "g"},
        {name: "basil", amount: 3.5, unit: "g"},
        {name: "pizza sauce", amount: 60, unit: "ml"}
    ],
    "Mushroom Cloud Pizza": [
        {name: "mushrooms", amount: 86, unit: "g"},
        {name: "goat's cheese", amount: 30, unit: "g"},
        {name: "sunflower seeds", amount: 2, unit: "g"},
        {name: "shredded mozzarella", amount: 94, unit: "g"},
        {name: "caramelised onions", amount: 100, unit: "g"},
        {name: "chilli oil", amount: 2, unit: "ml"},
        {name: "pizza sauce", amount: 60, unit: "ml"}
    ],
    "Spud Pizza": [
        {name: "pizza sauce", amount: 60, unit: "ml"},
        {name: "potato slices", amount: 100, unit: "g"},
        {name: "shredded mozzarella", amount: 94, unit: "g"},
        {name: "caramelised onions", amount: 76, unit: "g"},
        {name: "chilli oil", amount: 2, unit: "ml"},
        {name: "parmesan", amount: 8, unit: "g"}
    ],
    "Mish-Mash Pizza": [
        {name: "parma ham", amount: 40, unit: "g"},
        {name: "fig preserve", amount: 45, unit: "g"},
        {name: "goat's cheese", amount: 30, unit: "g"},
        {name: "shredded mozzarella", amount: 94, unit: "g"},
        {name: "rocket", amount: 20, unit: "g"},
        {name: "pizza sauce", amount: 60, unit: "ml"}
    ],
    "Lekker'izza": [
        {name: "bacon", amount: 64, unit: "g"},
        {name: "pepperoni", amount: 64, unit: "g"},
        {name: "peppadews", amount: 30, unit: "g"},
        {name: "shredded mozzarella", amount: 94, unit: "g"},
        {name: "feta", amount: 32, unit: "g"},
        {name: "red onion", amount: 8, unit: "g"},
        {name: "biltong", amount: 24, unit: "g"},
        {name: "chutney", amount: 12, unit: "g"},
        {name: "pizza sauce", amount: 60, unit: "ml"}
    ],
    "Vegan Harvest Pizza": [
        {name: "mushrooms", amount: 55, unit: "g"},
        {name: "baby marrow", amount: 40, unit: "g"},
        {name: "kalamata olives", amount: 50, unit: "g"},
        {name: "sundried tomatoes", amount: 60, unit: "g"},
        {name: "hummus", amount: 56, unit: "g"},
        {name: "pizza sauce", amount: 60, unit: "ml"},
        {name: "olive oil", amount: 2, unit: "ml"}
    ],
    "Poppa's Pizza": [
        {name: "anchovies", amount: 34, unit: "g"},
        {name: "kalamata olives", amount: 50, unit: "g"},
        {name: "fresh mozzarella", amount: 80, unit: "g"},
        {name: "shredded mozzarella", amount: 94, unit: "g"},
        {name: "basil", amount: 3.5, unit: "g"},
        {name: "pizza sauce", amount: 60, unit: "ml"}
    ],
    "Chick Tick Boom": [
        {name: "spicy chicken tikka", amount: 100, unit: "g"},
        {name: "peppadews", amount: 30, unit: "g"},
        {name: "fresh coriander", amount: 3.5, unit: "g"},
        {name: "shredded mozzarella", amount: 94, unit: "g"},
        {name: "pizza sauce", amount: 60, unit: "ml"}
    ],
    "Artichoke & Ham": [
        {name: "ham", amount: 40, unit: "g"},
        {name: "mushrooms", amount: 55, unit: "g"},
        {name: "artichoke leaves", amount: 100, unit: "g"},
        {name: "olives", amount: 50, unit: "g"},
        {name: "shredded mozzarella", amount: 94, unit: "g"},
        {name: "pizza sauce", amount: 60, unit: "ml"}
    ],
    "Glaze of Glory": [
        {name: "pizza sauce", amount: 60, unit: "ml"},
        {name: "shredded mozzarella", amount: 94, unit: "g"},
        {name: "bacon", amount: 64, unit: "g"},
        {name: "red onion", amount: 8, unit: "g"},
        {name: "feta", amount: 32, unit: "g"},
        {name: "balsamic glaze", amount: 10, unit: "ml"}
    ],
    "Mediterranean": [
        {name: "pizza sauce", amount: 60, unit: "ml"},
        {name: "shredded mozzarella", amount: 94, unit: "g"},
        {name: "baby marrow", amount: 40, unit: "g"},
        {name: "olives", amount: 50, unit: "g"},
        {name: "sundried tomatoes", amount: 60, unit: "g"},
        {name: "feta", amount: 32, unit: "g"},
        {name: "garlic", amount: 2, unit: "g"}
    ],
    "Quattro Formaggi": [
        {name: "pizza sauce", amount: 60, unit: "ml"},
        {name: "shredded mozzarella", amount: 94, unit: "g"},
        {name: "provolone", amount: 64, unit: "g"},
        {name: "fig preserve", amount: 45, unit: "g"},
        {name: "red onion", amount: 8, unit: "g"},
        {name: "parmesan", amount: 10, unit: "g"},
        {name: "blue cheese", amount: 25, unit: "g"}
    ],
    "Caprese": [
        {name: "pizza sauce", amount: 60, unit: "ml"},
        {name: "shredded mozzarella", amount: 94, unit: "g"},
        {name: "baby tomatoes", amount: 100, unit: "g"},
        {name: "fresh mozzarella", amount: 80, unit: "g"},
        {name: "basil pesto", amount: 6, unit: "g"},
        {name: "balsamic glaze", amount: 10, unit: "ml"},
        {name: "basil", amount: 3.5, unit: "g"}
    ],
    "Owen": [
        {name: "pizza sauce", amount: 60, unit: "ml"},
        {name: "shredded mozzarella", amount: 94, unit: "g"}
    ],
    "Jane's Dough": [
        {name: "olive oil", amount: 5, unit: "ml"},
        {name: "kalamata olives", amount: 50, unit: "g"},
        {name: "basil", amount: 3.5, unit: "g"},
        {name: "rosemary", amount: 2, unit: "g"},
        {name: "garlic", amount: 3, unit: "g"},
        {name: "rocket", amount: 20, unit: "g"}
    ],
    "Braaibroodjie Pizza": [
        {name: "pizza sauce", amount: 60, unit: "ml"},
        {name: "shredded mozzarella", amount: 94, unit: "g"},
        {name: "chutney", amount: 20, unit: "g"},
        {name: "red onion", amount: 20, unit: "g"},
        {name: "baby tomatoes", amount: 60, unit: "g"}
    ]
};

// Format date function
function formatDate(timestamp) {
    if (!timestamp) return 'Unknown';
    
    const date = timestamp instanceof Date ? timestamp : 
                (timestamp.toDate ? timestamp.toDate() : new Date(timestamp));
    
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}

// Format currency function
function formatCurrency(amount) {
    return 'R' + (Number(amount) || 0).toFixed(2);
}

// Update last updated text
function updateLastUpdated() {
    const now = new Date();
    lastUpdatedElement.textContent = `Last updated: ${now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}`;
}

// Update order status in Firebase
async function updateOrderStatus(orderId, newStatus, buttonElement) {
    try {
        // Show loading state on button
        const originalText = buttonElement.innerHTML;
        buttonElement.innerHTML = '⏳ Updating...';
        buttonElement.disabled = true;
        
        debugLog(`Updating order ${orderId} status to ${newStatus}`);
        
        // Update the order status in Firestore
        await db.collection('orders').doc(orderId).update({
            status: newStatus,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
            // Mark as completed if status is done
            completed: newStatus === 'done'
        });
        
        debugLog(`Order ${orderId} status updated successfully to ${newStatus}`);
        
        // Show success feedback
        buttonElement.innerHTML = '✅ Updated!';
        buttonElement.classList.add('btn-success');
        
        // Reset button after a short delay and refresh orders
        setTimeout(() => {
            if (realtimeToggle.checked) {
                // Real-time updates will handle the refresh
                debugLog('Real-time updates enabled, waiting for automatic refresh');
            } else {
                // Manually refresh the orders
                fetchOrders();
            }
        }, 1000);
        
    } catch (error) {
        debugLog(`Error updating order ${orderId} status: ${error.message}`, 'error');
        
        // Show error feedback
        buttonElement.innerHTML = '❌ Error';
        buttonElement.classList.add('btn-error');
        
        // Reset button after delay
        setTimeout(() => {
            buttonElement.innerHTML = originalText;
            buttonElement.disabled = false;
            buttonElement.classList.remove('btn-error');
        }, 3000);
        
        // Show user-friendly error message
        showNotification(`Failed to update order status: ${error.message}`, 'error');
    }
}

// Enhanced error state management
function showErrorState(errorType, details = {}) {
    const ordersContainer = document.getElementById('ordersContainer');
    let errorContent = '';
    
    switch (errorType) {
        case 'firebaseNotLoaded':
            errorContent = `
                <div class="error-state">
                    <div class="error-icon">🔌</div>
                    <h3>Connection Issue</h3>
                    <p>Unable to load Firebase services. This usually happens when:</p>
                    <ul>
                        <li>Your internet connection is unstable</li>
                        <li>Firebase services are blocked by your network</li>
                        <li>The application is being served from file:// instead of http://</li>
                    </ul>
                    <div class="error-actions">
                        <button onclick="location.reload()" class="retry-btn">🔄 Retry</button>
                        <button onclick="document.getElementById('debugToggle').click()" class="debug-btn">🔍 Show Debug</button>
                    </div>
                </div>
            `;
            break;
            
        case 'permissionDenied':
            errorContent = `
                <div class="error-state">
                    <div class="error-icon">🚫</div>
                    <h3>Access Denied</h3>
                    <p>Firebase security rules are preventing access to the database.</p>
                    <p><strong>For GitHub Pages users:</strong> Update your Firestore security rules to allow access from <code>${window.location.hostname}</code></p>
                    <div class="error-actions">
                        <button onclick="fetchOrders()" class="retry-btn">🔄 Try Again</button>
                        <button onclick="window.open('https://console.firebase.google.com')" class="external-btn">⚙️ Firebase Console</button>
                    </div>
                </div>
            `;
            break;
            
        case 'networkError':
            errorContent = `
                <div class="error-state">
                    <div class="error-icon">📡</div>
                    <h3>Network Error</h3>
                    <p>Unable to connect to the server. Please check your internet connection.</p>
                    <div class="error-actions">
                        <button onclick="fetchOrders()" class="retry-btn">🔄 Retry</button>
                        <button onclick="toggleOfflineMode()" class="offline-btn">📱 Use Offline</button>
                    </div>
                </div>
            `;
            break;
            
        case 'updateFailed':
            errorContent = `
                <div class="error-state small">
                    <div class="error-icon">⚠️</div>
                    <p>Failed to update order: ${details.message || 'Unknown error'}</p>
                    <div class="error-actions">
                        <button onclick="fetchOrders()" class="retry-btn small">🔄 Refresh Orders</button>
                    </div>
                </div>
            `;
            break;
            
        default:
            errorContent = `
                <div class="error-state">
                    <div class="error-icon">❌</div>
                    <h3>Something went wrong</h3>
                    <p>${details.message || 'An unexpected error occurred'}</p>
                    <div class="error-actions">
                        <button onclick="location.reload()" class="retry-btn">🔄 Reload Page</button>
                    </div>
                </div>
            `;
    }
    
    ordersContainer.innerHTML = errorContent;
}

// Show notification to user
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">${type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️'}</span>
            <span class="notification-message">${message}</span>
        </div>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Show with animation
    setTimeout(() => notification.classList.add('notification-show'), 100);
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        notification.classList.remove('notification-show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 5000);
}

// Handle offline functionality (placeholder for future enhancement)
function toggleOfflineMode() {
    showNotification('Offline mode will be available in a future update', 'info');
}

// Show dialog for adding a note to an order
function showAddNoteDialog(orderId, orderData) {
    // Create dialog overlay
    const dialogOverlay = document.createElement('div');
    dialogOverlay.className = 'dialog-overlay';
    
    // Create dialog content
    const dialog = document.createElement('div');
    dialog.className = 'note-dialog';
    
    dialog.innerHTML = `
        <div class="dialog-header">
            <h3>Add Note to Order #${orderId.substring(0, 6)}</h3>
            <button class="dialog-close" onclick="closeNoteDialog()">×</button>
        </div>
        <div class="dialog-body">
            <div class="order-summary">
                <strong>${orderData.customerName || 'Unknown'}</strong> • ${orderData.platform || 'Unknown'}
            </div>
            <textarea id="noteContent" placeholder="Enter note (e.g., 'Customer called - extra cheese on pizza 1', 'Allergy: no nuts')" maxlength="500"></textarea>
            <div class="character-count">
                <span id="charCount">0</span>/500 characters
            </div>
        </div>
        <div class="dialog-actions">
            <button class="dialog-btn dialog-btn-cancel" onclick="closeNoteDialog()">Cancel</button>
            <button class="dialog-btn dialog-btn-save" onclick="saveOrderNote('${orderId}')">💾 Save Note</button>
        </div>
    `;
    
    dialogOverlay.appendChild(dialog);
    document.body.appendChild(dialogOverlay);
    
    // Focus textarea
    setTimeout(() => {
        const textarea = document.getElementById('noteContent');
        textarea.focus();
        
        // Character counter
        textarea.addEventListener('input', () => {
            document.getElementById('charCount').textContent = textarea.value.length;
        });
        
        // Enter to save (Ctrl/Cmd + Enter)
        textarea.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                saveOrderNote(orderId);
            }
        });
    }, 100);
    
    // Close on overlay click
    dialogOverlay.addEventListener('click', (e) => {
        if (e.target === dialogOverlay) {
            closeNoteDialog();
        }
    });
    
    // Store reference for cleanup
    window.currentNoteDialog = dialogOverlay;
}

// Close note dialog
function closeNoteDialog() {
    if (window.currentNoteDialog) {
        document.body.removeChild(window.currentNoteDialog);
        window.currentNoteDialog = null;
    }
}

// Save note to order
async function saveOrderNote(orderId) {
    const noteContent = document.getElementById('noteContent').value.trim();
    
    if (!noteContent) {
        showNotification('Please enter a note', 'error');
        return;
    }
    
    const saveBtn = document.querySelector('.dialog-btn-save');
    const originalText = saveBtn.innerHTML;
    
    try {
        saveBtn.innerHTML = '⏳ Saving...';
        saveBtn.disabled = true;
        
        debugLog(`Adding note to order ${orderId}: ${noteContent}`);
        
        // Create note object
        const newNote = {
            content: noteContent,
            author: 'Staff', // Could be expanded to include user names
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Update the order with the new note
        await db.collection('orders').doc(orderId).update({
            staffNotes: firebase.firestore.FieldValue.arrayUnion(newNote),
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        debugLog(`Note added successfully to order ${orderId}`);
        
        showNotification('Note added successfully', 'success');
        closeNoteDialog();
        
        // Refresh orders to show the new note
        if (realtimeToggle.checked) {
            // Real-time updates will handle the refresh
            debugLog('Real-time updates enabled, waiting for automatic refresh');
        } else {
            fetchOrders();
        }
        
    } catch (error) {
        debugLog(`Error adding note to order ${orderId}: ${error.message}`, 'error');
        showNotification(`Failed to add note: ${error.message}`, 'error');
        
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
}

// Calculate order duration for display
function calculateOrderDuration(orderTime) {
    if (!orderTime) return 'Unknown';
    
    const now = new Date();
    const orderDate = orderTime instanceof Date ? orderTime : new Date(orderTime);
    const diffMs = now - orderDate;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    const remainingMinutes = diffMinutes % 60;
    
    if (diffHours < 24) {
        return remainingMinutes > 0 ? `${diffHours}h ${remainingMinutes}m` : `${diffHours}h`;
    }
    
    const diffDays = Math.floor(diffHours / 24);
    const remainingHours = diffHours % 24;
    
    if (remainingHours > 0) {
        return `${diffDays}d ${remainingHours}h`;
    } else {
        return `${diffDays}d`;
    }
}

// Calculate duration in minutes for logic decisions
function calculateDurationInMinutes(orderTime) {
    if (!orderTime) return 0;
    
    const now = new Date();
    const orderDate = orderTime instanceof Date ? orderTime : new Date(orderTime);
    const diffMs = now - orderDate;
    return Math.floor(diffMs / (1000 * 60));
}

// Update all order timers (called periodically)
function updateOrderTimers() {
    const timerElements = document.querySelectorAll('.order-timer');
    timerElements.forEach(timerElement => {
        const orderCard = timerElement.closest('.order-card');
        if (!orderCard) return;
        
        const orderId = orderCard.id.replace('order-', '');
        const order = orders.find(o => o.id === orderId);
        
        if (order) {
            const data = order.data();
            let orderTime = null;
            if (data.orderTime) {
                orderTime = typeof data.orderTime === 'string' ? new Date(data.orderTime) : 
                           data.orderTime.toDate ? data.orderTime.toDate() : new Date();
            }
            
            const duration = calculateOrderDuration(orderTime);
            const durationMinutes = calculateDurationInMinutes(orderTime);
            const status = (data.status || '').toLowerCase();
            
            // Update timer display
            timerElement.innerHTML = `⏱️ ${duration}`;
            
            // Update warning classes
            timerElement.classList.remove('timer-warning', 'timer-critical');
            if (durationMinutes > 30 && status === 'preparing') {
                timerElement.classList.add('timer-warning');
            } else if (durationMinutes > 45) {
                timerElement.classList.add('timer-critical');
            }
        }
    });
}

// Create order card element
function createOrderCard(order) {
    const data = order.data();
    const id = order.id;
    
    // Get all order details
    const status = data.status || 'Unknown';
    const customerName = data.customerName || 'Unknown';
    const platform = data.platform || 'Unknown';
    const totalAmount = data.totalAmount || 0;
    const prepTimeMinutes = data.prepTimeMinutes || 0;
    const hasSpecialInstructions = data.hasSpecialInstructions || false;
    const completed = data.completed || false;
    const source = data.source || 'Unknown';
    const timestamp = data.timestamp || null;
    const cooked = data.cooked || [];
    
    // Parse dates
    let orderTime = null;
    if (data.orderTime) {
        orderTime = typeof data.orderTime === 'string' ? new Date(data.orderTime) : 
                   data.orderTime.toDate ? data.orderTime.toDate() : new Date();
    }
    
    let dueTime = null;
    if (data.dueTime) {
        dueTime = typeof data.dueTime === 'string' ? new Date(data.dueTime) : 
                 data.dueTime.toDate ? data.dueTime.toDate() : new Date(data.dueTime);
    }
    
    // Create card element
    const orderCard = document.createElement('div');
    orderCard.className = 'order-card';
    orderCard.id = `order-${id}`;
    
    // Create order header
    const orderHeader = document.createElement('div');
    orderHeader.className = 'order-header';
    
    const orderTitle = document.createElement('h3');
    orderTitle.className = 'order-title';
    orderTitle.textContent = `Order #${id.substring(0, 6)}`;
    
    const statusContainer = document.createElement('div');
    statusContainer.className = 'status-container';
    
    const statusBadge = document.createElement('div');
    statusBadge.className = `status-badge ${status.toLowerCase()}`;
    statusBadge.textContent = status;
    
    // Add timer showing how long the order has been in current status
    const orderTimer = document.createElement('div');
    orderTimer.className = 'order-timer';
    const duration = calculateOrderDuration(orderTime);
    orderTimer.innerHTML = `⏱️ ${duration}`;
    
    // Add warning class for orders taking too long
    const durationMinutes = calculateDurationInMinutes(orderTime);
    if (durationMinutes > 30 && status.toLowerCase() === 'preparing') {
        orderTimer.classList.add('timer-warning');
    } else if (durationMinutes > 45) {
        orderTimer.classList.add('timer-critical');
    }
    
    statusContainer.appendChild(statusBadge);
    statusContainer.appendChild(orderTimer);

    // Due-time badge: shows ON TIME / LATE / minutes remaining
    if (dueTime) {
        const nowMs = new Date();
        const diffMins = Math.floor((dueTime - nowMs) / 60000);
        const timeBadge = document.createElement('div');
        timeBadge.className = 'due-time-badge';
        if (diffMins < -15) {
            timeBadge.classList.add('due-time-very-late');
            timeBadge.textContent = `${Math.abs(diffMins)}m LATE`;
            orderCard.classList.add('order-card--very-late');
        } else if (diffMins < 0) {
            timeBadge.classList.add('due-time-late');
            timeBadge.textContent = `${Math.abs(diffMins)}m LATE`;
            orderCard.classList.add('order-card--late');
        } else if (diffMins <= 5) {
            timeBadge.classList.add('due-time-urgent');
            timeBadge.textContent = `${diffMins}m left`;
            orderCard.classList.add('order-card--urgent');
        } else {
            timeBadge.classList.add('due-time-ok');
            timeBadge.textContent = `${diffMins}m`;
        }
        statusContainer.appendChild(timeBadge);
    }

    orderHeader.appendChild(orderTitle);
    orderHeader.appendChild(statusContainer);
    
    // Create customer info section
    const customerInfo = document.createElement('div');
    customerInfo.className = 'customer-info';
    
    // Customer
    const customerNameInfo = document.createElement('div');
    customerNameInfo.className = 'info-item';
    
    const customerLabel = document.createElement('span');
    customerLabel.className = 'info-label';
    customerLabel.textContent = 'Customer';
    
    const customerValue = document.createElement('span');
    customerValue.className = 'info-value';
    customerValue.textContent = customerName;
    
    customerNameInfo.appendChild(customerLabel);
    customerNameInfo.appendChild(customerValue);
    customerInfo.appendChild(customerNameInfo);
    
    // Platform
    const platformInfo = document.createElement('div');
    platformInfo.className = 'info-item';
    
    const platformLabel = document.createElement('span');
    platformLabel.className = 'info-label';
    platformLabel.textContent = 'Platform';
    
    const platformValue = document.createElement('span');
    platformValue.className = 'info-value';
    
    const platformTag = document.createElement('span');
    platformTag.className = 'platform-tag';
    
    // Add platform-specific class
    if (platform.includes('Uber Eats')) {
        platformTag.classList.add('uber-eats');
    } else if (platform.includes('Mr D Food')) {
        platformTag.classList.add('mr-d-food');
    } else if (platform.includes('Window')) {
        platformTag.classList.add('window');
    } else if (platform.includes('Customer Pickup') || platform.includes('Pickup')) {
        platformTag.classList.add('pickup');
    }
    
    platformTag.textContent = platform;
    platformValue.appendChild(platformTag);
    
    platformInfo.appendChild(platformLabel);
    platformInfo.appendChild(platformValue);
    customerInfo.appendChild(platformInfo);
    
    // Order Time
    const orderTimeInfo = document.createElement('div');
    orderTimeInfo.className = 'info-item';
    
    const orderTimeLabel = document.createElement('span');
    orderTimeLabel.className = 'info-label';
    orderTimeLabel.textContent = 'Order Time';
    
    const orderTimeValue = document.createElement('span');
    orderTimeValue.className = 'info-value';
    orderTimeValue.textContent = formatDate(orderTime);
    
    orderTimeInfo.appendChild(orderTimeLabel);
    orderTimeInfo.appendChild(orderTimeValue);
    customerInfo.appendChild(orderTimeInfo);
    
    // Total
    const totalInfo = document.createElement('div');
    totalInfo.className = 'info-item';
    
    const totalLabel = document.createElement('span');
    totalLabel.className = 'info-label';
    totalLabel.textContent = 'Total';
    
    const totalValue = document.createElement('span');
    totalValue.className = 'info-value';
    totalValue.textContent = formatCurrency(totalAmount);
    
    totalInfo.appendChild(totalLabel);
    totalInfo.appendChild(totalValue);
    customerInfo.appendChild(totalInfo);
    
    // Create card structure
    orderCard.appendChild(orderHeader);
    orderCard.appendChild(customerInfo);
    
    // Add special instructions indicator if any
    if (hasSpecialInstructions) {
        const specialInstructions = document.createElement('div');
        specialInstructions.className = 'special-instructions';
        specialInstructions.innerHTML = '⚠️ Has special instructions';
        orderCard.appendChild(specialInstructions);
    }
    
    // Add pizza summary directly to the main card
    if (data.pizzas && data.pizzas.length > 0) {
        const pizzaSummary = document.createElement('div');
        pizzaSummary.className = 'pizza-summary';
        pizzaSummary.style.padding = '0 1rem 0.75rem';
        pizzaSummary.style.fontSize = '0.9rem';
        
        const pizzaList = document.createElement('ul');
        pizzaList.style.margin = '0';
        pizzaList.style.padding = '0 0 0 1.5rem';
        pizzaList.style.listStyle = 'circle';
        
        data.pizzas.forEach(pizza => {
            const pizzaItem = document.createElement('li');
            pizzaItem.style.marginBottom = '0.25rem';
            
            // Use pizzaType for the pizza name as shown in the database structure
            const pizzaName = pizza.pizzaType || 'Pizza';
            const pizzaQuantity = pizza.quantity > 1 ? `(${pizza.quantity}x)` : '';
            
            pizzaItem.textContent = `${pizzaName} ${pizzaQuantity}`;
            pizzaList.appendChild(pizzaItem);
        });
        
        pizzaSummary.appendChild(pizzaList);
        orderCard.appendChild(pizzaSummary);
    }
    
    // Add detailed information section
    const pizzaDetails = document.createElement('div');
    pizzaDetails.className = 'pizza-details';
    
    // Add order status info
    const orderStatusInfo = document.createElement('div');
    orderStatusInfo.className = 'info-section';
    orderStatusInfo.style.padding = '0.75rem 1rem';
    orderStatusInfo.style.display = 'flex';
    orderStatusInfo.style.flexWrap = 'wrap';
    orderStatusInfo.style.gap = '1rem';
    orderStatusInfo.style.borderBottom = '1px solid var(--border-color)';
    
    // Order Source
    const sourceInfo = document.createElement('div');
    sourceInfo.className = 'info-item';
    
    const sourceLabel = document.createElement('span');
    sourceLabel.className = 'info-label';
    sourceLabel.textContent = 'Source';
    
    const sourceValue = document.createElement('span');
    sourceValue.className = 'info-value';
    sourceValue.textContent = source;
    
    sourceInfo.appendChild(sourceLabel);
    sourceInfo.appendChild(sourceValue);
    orderStatusInfo.appendChild(sourceInfo);
    
    // Preparation Time
    const prepTimeInfo = document.createElement('div');
    prepTimeInfo.className = 'info-item';
    
    const prepTimeLabel = document.createElement('span');
    prepTimeLabel.className = 'info-label';
    prepTimeLabel.textContent = 'Prep Time';
    
    const prepTimeValue = document.createElement('span');
    prepTimeValue.className = 'info-value';
    prepTimeValue.textContent = `${prepTimeMinutes} minutes`;
    
    prepTimeInfo.appendChild(prepTimeLabel);
    prepTimeInfo.appendChild(prepTimeValue);
    orderStatusInfo.appendChild(prepTimeInfo);
    
    // Due Time if available
    if (dueTime) {
        const dueTimeInfo = document.createElement('div');
        dueTimeInfo.className = 'info-item';
        
        const dueTimeLabel = document.createElement('span');
        dueTimeLabel.className = 'info-label';
        dueTimeLabel.textContent = 'Due Time';
        
        const dueTimeValue = document.createElement('span');
        dueTimeValue.className = 'info-value';
        dueTimeValue.textContent = formatDate(dueTime);
        
        dueTimeInfo.appendChild(dueTimeLabel);
        dueTimeInfo.appendChild(dueTimeValue);
        orderStatusInfo.appendChild(dueTimeInfo);
    }
    
    // Completed Status
    const completedInfo = document.createElement('div');
    completedInfo.className = 'info-item';
    
    const completedLabel = document.createElement('span');
    completedLabel.className = 'info-label';
    completedLabel.textContent = 'Status';
    
    const completedValue = document.createElement('span');
    completedValue.className = 'info-value';
    completedValue.style.fontWeight = 'bold';
    
    if (completed) {
        completedValue.textContent = 'Completed';
        completedValue.style.color = 'var(--success-color)';
    } else {
        completedValue.textContent = 'In Progress';
        completedValue.style.color = 'var(--info-color)';
    }
    
    completedInfo.appendChild(completedLabel);
    completedInfo.appendChild(completedValue);
    orderStatusInfo.appendChild(completedInfo);
    
    pizzaDetails.appendChild(orderStatusInfo);
    
    // Add order-level special instructions if any exist
    if (data.specialInstructions && typeof data.specialInstructions === 'string' && data.specialInstructions.trim() !== '') {
        const orderSpecialInstructions = document.createElement('div');
        orderSpecialInstructions.className = 'order-special-instructions';
        orderSpecialInstructions.innerHTML = `<h4>Order Special Instructions</h4><p>${data.specialInstructions}</p>`;
        pizzaDetails.appendChild(orderSpecialInstructions);
    }

    // Add pizzas section
    if (data.pizzas && data.pizzas.length > 0) {
        const pizzasContainer = document.createElement('div');
        pizzasContainer.className = 'pizzas-container';
        
        const pizzasTitle = document.createElement('h4');
        pizzasTitle.className = 'pizzas-title';
        pizzasTitle.textContent = `Pizzas (${data.pizzas.length})`;
        pizzasContainer.appendChild(pizzasTitle);
        
        data.pizzas.forEach((pizza, index) => {
            const pizzaItem = document.createElement('div');
            pizzaItem.className = 'pizza-item';
            
            const pizzaName = document.createElement('div');
            pizzaName.className = 'pizza-name';
            pizzaName.innerHTML = `<strong>${index + 1}. ${pizza.pizzaType || 'Pizza'}</strong> ${formatCurrency(pizza.totalPrice || 0)}`;
            pizzaItem.appendChild(pizzaName);
            
            // Display special instructions for this pizza if any
            if (pizza.specialInstructions && pizza.specialInstructions.trim() !== '') {
                const instructionsDiv = document.createElement('div');
                instructionsDiv.className = 'pizza-special-instructions';
                instructionsDiv.innerHTML = `<strong>Special Instructions:</strong> ${pizza.specialInstructions}`;
                pizzaItem.appendChild(instructionsDiv);
            }
            
            if (pizza.toppings && pizza.toppings.length > 0) {
                const toppings = document.createElement('div');
                toppings.className = 'pizza-toppings';
                toppings.textContent = `Toppings: ${pizza.toppings.join(', ')}`;
                pizzaItem.appendChild(toppings);
            }
            
            // Check if this pizza has been cooked
            if (cooked && cooked.some(item => item === pizza.name)) {
                const cookedStatus = document.createElement('div');
                cookedStatus.style.color = 'var(--success-color)';
                cookedStatus.style.fontSize = '0.75rem';
                cookedStatus.style.marginTop = '0.25rem';
                cookedStatus.innerHTML = '✓ Cooked';
                pizzaItem.appendChild(cookedStatus);
            }
            
            pizzasContainer.appendChild(pizzaItem);
        });
        
        pizzaDetails.appendChild(pizzasContainer);
    }
    
    orderCard.appendChild(pizzaDetails);
    
    // Show existing notes if any
    if (data.staffNotes && data.staffNotes.length > 0) {
        const notesSection = document.createElement('div');
        notesSection.className = 'staff-notes-section';
        
        const notesTitle = document.createElement('h4');
        notesTitle.className = 'notes-title';
        notesTitle.textContent = 'Staff Notes';
        notesSection.appendChild(notesTitle);
        
        data.staffNotes.forEach(note => {
            const noteItem = document.createElement('div');
            noteItem.className = 'staff-note';
            
            const noteTimestamp = note.timestamp ? 
                (typeof note.timestamp === 'string' ? new Date(note.timestamp) : 
                 note.timestamp.toDate ? note.timestamp.toDate() : new Date()) : new Date();
            
            noteItem.innerHTML = `
                <div class="note-content">${note.content}</div>
                <div class="note-meta">
                    <span class="note-author">${note.author || 'Staff'}</span>
                    <span class="note-time">${formatDate(noteTimestamp)}</span>
                </div>
            `;
            notesSection.appendChild(noteItem);
        });
        
        orderCard.appendChild(notesSection);
    }
    
    // Add status update buttons (only for non-completed orders)
    if (status.toLowerCase() !== 'done' && status.toLowerCase() !== 'delivered' && status.toLowerCase() !== 'cancelled') {
        const statusActions = document.createElement('div');
        statusActions.className = 'status-actions';
        
        // Define status progression based on current status
        let nextStatuses = [];
        const currentStatus = status.toLowerCase();
        
        if (currentStatus === 'pending') {
            nextStatuses = [{ status: 'preparing', label: '👨‍🍳 Start Preparing', class: 'btn-preparing' }];
        } else if (currentStatus === 'preparing') {
            nextStatuses = [
                { status: 'ready', label: '✅ Mark Ready', class: 'btn-ready' },
                { status: 'done', label: '🎉 Complete', class: 'btn-complete' }
            ];
        } else if (currentStatus === 'ready') {
            nextStatuses = [{ status: 'done', label: '🎉 Complete', class: 'btn-complete' }];
        }
        
        // Create buttons for each possible next status
        nextStatuses.forEach(({ status: nextStatus, label, class: btnClass }) => {
            const statusButton = document.createElement('button');
            statusButton.className = `status-action-btn ${btnClass}`;
            statusButton.innerHTML = label;
            statusButton.onclick = (e) => {
                e.stopPropagation(); // Prevent card expansion
                updateOrderStatus(id, nextStatus, statusButton);
            };
            statusActions.appendChild(statusButton);
        });
        
        // Add quick complete button for all non-completed orders
        if (currentStatus !== 'done') {
            const quickCompleteBtn = document.createElement('button');
            quickCompleteBtn.className = 'status-action-btn btn-quick-complete';
            quickCompleteBtn.innerHTML = '⚡ Quick Complete';
            quickCompleteBtn.onclick = (e) => {
                e.stopPropagation();
                updateOrderStatus(id, 'done', quickCompleteBtn);
            };
            statusActions.appendChild(quickCompleteBtn);
        }
        
        // Add quick actions (notes)
        const addNoteBtn = document.createElement('button');
        addNoteBtn.className = 'status-action-btn btn-add-note';
        addNoteBtn.innerHTML = '📝 Add Note';
        addNoteBtn.onclick = (e) => {
            e.stopPropagation();
            showAddNoteDialog(id, data);
        };
        statusActions.appendChild(addNoteBtn);
        
        orderCard.appendChild(statusActions);
    }
    
    // Add expandable hint at bottom of card
    const expandHint = document.createElement('div');
    expandHint.className = 'card-expandable-hint';
    expandHint.innerHTML = 'Tap for details';
    orderCard.appendChild(expandHint);
    
    // Toggle card expansion on click
    orderCard.addEventListener('click', () => {
        orderCard.classList.toggle('expanded');
        if (orderCard.classList.contains('expanded')) {
            expandHint.innerHTML = 'Tap to collapse';
        } else {
            expandHint.innerHTML = 'Tap for details';
        }
    });
    
    return orderCard;
}

// Apply search and filters to orders
function applySearchAndFilters(ordersList) {
    let filteredOrders = ordersList;
    
    // Apply search query
    if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        filteredOrders = filteredOrders.filter(order => {
            const data = order.data();
            const customerName = (data.customerName || '').toLowerCase();
            const orderId = order.id.toLowerCase();
            const platform = (data.platform || '').toLowerCase();
            const status = (data.status || '').toLowerCase();
            
            return customerName.includes(query) || 
                   orderId.includes(query) || 
                   platform.includes(query) ||
                   status.includes(query);
        });
    }
    
    // Apply quick filters
    if (quickFilter !== 'all') {
        filteredOrders = filteredOrders.filter(order => {
            const data = order.data();
            
            switch (quickFilter) {
                case 'late':
                    // Orders that are taking too long
                    const orderTime = data.orderTime ? 
                        (typeof data.orderTime === 'string' ? new Date(data.orderTime) : 
                         data.orderTime.toDate ? data.orderTime.toDate() : new Date()) : null;
                    if (!orderTime) return false;
                    const durationMinutes = calculateDurationInMinutes(orderTime);
                    const status = (data.status || '').toLowerCase();
                    return (durationMinutes > 30 && status === 'preparing') || durationMinutes > 45;
                    
                case 'special':
                    // Orders with special instructions
                    return data.hasSpecialInstructions || 
                           (data.specialInstructions && data.specialInstructions.trim() !== '') ||
                           (data.pizzas && data.pizzas.some(pizza => 
                               pizza.specialInstructions && pizza.specialInstructions.trim() !== ''));
                    
                case 'today':
                    // Orders from today
                    if (!data.orderTime) return false;
                    const todayOrderTime = typeof data.orderTime === 'string' ? 
                        new Date(data.orderTime) : 
                        (data.orderTime.toDate ? data.orderTime.toDate() : new Date());
                    const today = new Date();
                    return todayOrderTime.getDate() === today.getDate() && 
                           todayOrderTime.getMonth() === today.getMonth() && 
                           todayOrderTime.getFullYear() === today.getFullYear();
                    
                default:
                    return true;
            }
        });
    }
    
    return filteredOrders;
}

// Filter orders based on tab
function filterOrdersByStatus(status) {
    if (status === 'stats' || status === 'monthly') {
        return orders; // Return all orders for stats
    }
    
    let statusFiltered;
    if (status === 'all') {
        statusFiltered = orders; // All orders
    } else if (status === 'preparing') {
        // Special case: include 'pending' orders in 'preparing' tab
        statusFiltered = orders.filter(order => {
            const data = order.data();
            const orderStatus = data.status ? data.status.toLowerCase() : '';
            return orderStatus === 'preparing' || orderStatus === 'pending';
        });
    } else {
        // Filter by status for other tabs
        statusFiltered = orders.filter(order => {
            const data = order.data();
            return data.status && data.status.toLowerCase() === status;
        });
    }
    
    // Apply search and filters
    return applySearchAndFilters(statusFiltered);
}

// Display orders or statistics in the container
function displayOrders(filteredOrders) {
    // Clear container
    ordersContainer.innerHTML = '';
    
    // Check if this is the stats tab
    if (currentTab === 'stats') {
        displayStatistics(filteredOrders);
        return;
    }
    
    // Check if this is the monthly stats tab
    if (currentTab === 'monthly') {
        displayMonthlyStatistics(filteredOrders);
        return;
    }
    
    // Show search results info if search is active
    if (searchQuery.trim() || quickFilter !== 'all') {
        const resultsInfo = document.createElement('div');
        resultsInfo.className = 'search-results-info';
        
        let infoText = `Showing ${filteredOrders.length} orders`;
        if (searchQuery.trim()) {
            infoText += ` matching "${searchQuery}"`;
        }
        if (quickFilter !== 'all') {
            const filterLabels = {
                'late': 'Late Orders',
                'special': 'Special Instructions',
                'today': 'Today\'s Orders'
            };
            infoText += quickFilter !== 'all' && searchQuery.trim() ? 
                ` with filter: ${filterLabels[quickFilter]}` : 
                ` for: ${filterLabels[quickFilter]}`;
        }
        
        resultsInfo.textContent = infoText;
        ordersContainer.appendChild(resultsInfo);
    }
    
    // If no orders
    if (filteredOrders.length === 0) {
        const noOrdersMessage = searchQuery.trim() || quickFilter !== 'all' ? 
            'No orders match your search criteria' : 
            'No orders found';
            
        ordersContainer.innerHTML += `
            <div class="no-orders">
                <p>${noOrdersMessage}</p>
            </div>
        `;
        return;
    }
    
    // Sort by due time: late orders first, then by soonest due time
    const now = new Date();
    const sorted = [...filteredOrders].sort((a, b) => {
        const aData = a.data();
        const bData = b.data();
        const dueA = aData.dueTime ? new Date(aData.dueTime) : new Date(8640000000000000);
        const dueB = bData.dueTime ? new Date(bData.dueTime) : new Date(8640000000000000);
        const lateA = dueA < now;
        const lateB = dueB < now;
        if (lateA && !lateB) return -1;
        if (!lateA && lateB) return 1;
        return dueA - dueB;
    });

    sorted.forEach(order => {
        const orderCard = createOrderCard(order);
        ordersContainer.appendChild(orderCard);
    });

    updateLastUpdated();
}

// Display statistics for today's orders
function displayStatistics(allOrders, selectedDate = null) {
    // Create stats container
    const statsContainer = document.createElement('div');
    statsContainer.className = 'stats-container';

    // Add date selector at the top
    const dateSelectorContainer = document.createElement('div');
    dateSelectorContainer.className = 'date-selector-container';
    dateSelectorContainer.innerHTML = `
        <div class="date-selector-controls">
            <button id="prevDayBtn" class="date-nav-btn">‹ Previous</button>
            <input type="date" id="statsDatePicker" class="stats-date-picker" value="${selectedDate ? selectedDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}">
            <button id="todayBtn" class="date-nav-btn">Today</button>
            <button id="nextDayBtn" class="date-nav-btn">Next ›</button>
        </div>
        <div class="date-comparison-toggle">
            <label>
                <input type="checkbox" id="showComparisonToggle">
                <span>Show Yesterday Comparison</span>
            </label>
        </div>
    `;
    statsContainer.appendChild(dateSelectorContainer);

    // Get selected date or default to today
    const targetDate = selectedDate || new Date();
    targetDate.setHours(0, 0, 0, 0);

    // Get yesterday for comparison
    const yesterday = new Date(targetDate);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    // Filter orders for selected date
    const todaysOrders = allOrders.filter(order => {
        const data = order.data();
        const orderTime = data.orderTime && typeof data.orderTime === 'string' ?
            new Date(data.orderTime) :
            (data.orderTime && data.orderTime.toDate ? data.orderTime.toDate() : null);

        if (!orderTime) return false;

        const orderDate = new Date(orderTime);

        // Check if same day (local time) only
        const isSameDay = orderDate.getDate() === targetDate.getDate() &&
                          orderDate.getMonth() === targetDate.getMonth() &&
                          orderDate.getFullYear() === targetDate.getFullYear();

        return isSameDay;
    });

    // Filter orders for yesterday (for comparison)
    const yesterdaysOrders = allOrders.filter(order => {
        const data = order.data();
        const orderTime = data.orderTime && typeof data.orderTime === 'string' ?
            new Date(data.orderTime) :
            (data.orderTime && data.orderTime.toDate ? data.orderTime.toDate() : null);

        if (!orderTime) return false;

        const orderDate = new Date(orderTime);

        const isSameDay = orderDate.getDate() === yesterday.getDate() &&
                          orderDate.getMonth() === yesterday.getMonth() &&
                          orderDate.getFullYear() === yesterday.getFullYear();

        return isSameDay;
    });
    
    // Calculate total pizzas sold today
    let totalPizzas = 0;
    let totalRevenue = 0;
    let totalLateOrders = 0;
    let statusCounts = {
        'pending': 0,
        'preparing': 0,
        'ready': 0,
        'done': 0,
        'delivered': 0,
        'cancelled': 0
    };

    // Different pizza types sold today
    let pizzaTypes = {};

    // Track ingredients usage
    let ingredientsUsage = {};

    // Platform breakdown tracking
    let platformStats = {};

    // Calculate yesterday's stats for comparison
    let yesterdayTotalOrders = yesterdaysOrders.length;
    let yesterdayTotalRevenue = 0;
    let yesterdayTotalPizzas = 0;

    yesterdaysOrders.forEach(order => {
        const data = order.data();
        yesterdayTotalRevenue += Number(data.totalAmount) || 0;
        if (data.pizzas && Array.isArray(data.pizzas)) {
            data.pizzas.forEach(pizza => {
                yesterdayTotalPizzas += pizza.quantity || 1;
            });
        }
    });
    
    todaysOrders.forEach(order => {
        const data = order.data();

        // Count by status
        const status = (data.status || '').toLowerCase();
        if (statusCounts.hasOwnProperty(status)) {
            statusCounts[status]++;
        }

        // Add to total revenue
        const orderAmount = Number(data.totalAmount) || 0;
        totalRevenue += orderAmount;

        // Track platform stats
        const platform = data.platform || 'Unknown';
        if (!platformStats[platform]) {
            platformStats[platform] = {
                orders: 0,
                revenue: 0,
                pizzas: 0
            };
        }
        platformStats[platform].orders++;
        platformStats[platform].revenue += orderAmount;
        
        // Check if order was/is late
        if (data.dueTime && data.orderTime) {
            const dueTime = typeof data.dueTime === 'string' ? 
                new Date(data.dueTime) : 
                (data.dueTime.toDate ? data.dueTime.toDate() : new Date(data.dueTime));
            
            const orderTime = typeof data.orderTime === 'string' ? 
                new Date(data.orderTime) : 
                (data.orderTime.toDate ? data.orderTime.toDate() : new Date(data.orderTime));
            
            const now = new Date();
            const prepTime = data.prepTimeMinutes || 0;
            
            // If status is not done/delivered and current time > due time, it's late
            if (status !== 'done' && status !== 'delivered' && now > dueTime) {
                totalLateOrders++;
            }
        }
        
        // Count pizzas in this order
        if (data.pizzas && Array.isArray(data.pizzas)) {
            data.pizzas.forEach(pizza => {
                // Add quantity (or 1 if quantity not specified)
                const quantity = pizza.quantity || 1;
                totalPizzas += quantity;
                platformStats[platform].pizzas += quantity;

                // Count by pizza type
                const pizzaType = pizza.pizzaType || 'Unknown';
                if (!pizzaTypes[pizzaType]) pizzaTypes[pizzaType] = 0;
                pizzaTypes[pizzaType] += quantity;
                
                // Track ingredients usage based on pizza type
                if (pizzaIngredients[pizzaType]) {
                    pizzaIngredients[pizzaType].forEach(ingredient => {
                        const ingredientKey = `${ingredient.name}|${ingredient.unit}`;
                        if (!ingredientsUsage[ingredientKey]) {
                            ingredientsUsage[ingredientKey] = {
                                name: ingredient.name,
                                amount: 0,
                                unit: ingredient.unit
                            };
                        }
                        ingredientsUsage[ingredientKey].amount += ingredient.amount * quantity;
                    });
                }
            });
        }
    });
    
    // Create today's date display
    const dateDisplay = document.createElement('div');
    dateDisplay.className = 'stats-date';
    dateDisplay.textContent = targetDate.toLocaleDateString(undefined, {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    statsContainer.appendChild(dateDisplay);

    // If no orders today
    if (todaysOrders.length === 0) {
        const noData = document.createElement('div');
        noData.className = 'no-orders';
        noData.innerHTML = `<p>No pizza orders found for ${targetDate.toLocaleDateString()}.</p>`;
        statsContainer.appendChild(noData);
        ordersContainer.appendChild(statsContainer);
        updateLastUpdated();

        // Setup date navigation event listeners even with no data
        setupDateNavigation(allOrders, targetDate);
        return;
    }

    // Calculate AOV
    const avgOrderValue = todaysOrders.length > 0 ? totalRevenue / todaysOrders.length : 0;
    const yesterdayAOV = yesterdayTotalOrders > 0 ? yesterdayTotalRevenue / yesterdayTotalOrders : 0;

    // Calculate percentage changes
    const orderChange = yesterdayTotalOrders > 0 ? ((todaysOrders.length - yesterdayTotalOrders) / yesterdayTotalOrders * 100) : 0;
    const revenueChange = yesterdayTotalRevenue > 0 ? ((totalRevenue - yesterdayTotalRevenue) / yesterdayTotalRevenue * 100) : 0;
    const pizzaChange = yesterdayTotalPizzas > 0 ? ((totalPizzas - yesterdayTotalPizzas) / yesterdayTotalPizzas * 100) : 0;
    const aovChange = yesterdayAOV > 0 ? ((avgOrderValue - yesterdayAOV) / yesterdayAOV * 100) : 0;

    // Helper function to create comparison badge
    function createComparisonBadge(change) {
        if (change === 0) return '<span class="comparison-neutral">→ 0%</span>';
        const icon = change > 0 ? '↑' : '↓';
        const className = change > 0 ? 'comparison-positive' : 'comparison-negative';
        return `<span class="${className}">${icon} ${Math.abs(change).toFixed(1)}%</span>`;
    }

    // Create summary cards
    const summaryCardsContainer = document.createElement('div');
    summaryCardsContainer.className = 'stats-summary-cards';

    // Orders card with comparison
    const ordersCard = document.createElement('div');
    ordersCard.className = 'stats-card';
    ordersCard.innerHTML = `
        <div class="stats-card-icon material-icons">receipt</div>
        <div class="stats-card-content">
            <div class="stats-card-label">Orders</div>
            <div class="stats-card-value">${todaysOrders.length}</div>
            <div class="stats-card-comparison">${createComparisonBadge(orderChange)}</div>
        </div>
    `;
    summaryCardsContainer.appendChild(ordersCard);

    // Pizzas card with comparison
    const pizzasCard = document.createElement('div');
    pizzasCard.className = 'stats-card';
    pizzasCard.innerHTML = `
        <div class="stats-card-icon material-icons">local_pizza</div>
        <div class="stats-card-content">
            <div class="stats-card-label">Pizzas Sold</div>
            <div class="stats-card-value">${totalPizzas}</div>
            <div class="stats-card-comparison">${createComparisonBadge(pizzaChange)}</div>
        </div>
    `;
    summaryCardsContainer.appendChild(pizzasCard);

    // Revenue card with comparison
    const revenueCard = document.createElement('div');
    revenueCard.className = 'stats-card';
    revenueCard.innerHTML = `
        <div class="stats-card-icon material-icons">payments</div>
        <div class="stats-card-content">
            <div class="stats-card-label">Total Revenue</div>
            <div class="stats-card-value">${formatCurrency(totalRevenue)}</div>
            <div class="stats-card-comparison">${createComparisonBadge(revenueChange)}</div>
        </div>
    `;
    summaryCardsContainer.appendChild(revenueCard);

    // AOV card with comparison
    const aovCard = document.createElement('div');
    aovCard.className = 'stats-card';
    aovCard.innerHTML = `
        <div class="stats-card-icon material-icons">attach_money</div>
        <div class="stats-card-content">
            <div class="stats-card-label">Avg Order Value</div>
            <div class="stats-card-value">${formatCurrency(avgOrderValue)}</div>
            <div class="stats-card-comparison">${createComparisonBadge(aovChange)}</div>
        </div>
    `;
    summaryCardsContainer.appendChild(aovCard);

    // Late orders card
    const lateCard = document.createElement('div');
    lateCard.className = `stats-card ${totalLateOrders > 0 ? 'stats-card-warning' : ''}`;
    lateCard.innerHTML = `
        <div class="stats-card-icon material-icons">schedule</div>
        <div class="stats-card-content">
            <div class="stats-card-label">Late Orders</div>
            <div class="stats-card-value">${totalLateOrders}</div>
        </div>
    `;
    summaryCardsContainer.appendChild(lateCard);

    statsContainer.appendChild(summaryCardsContainer);
    
    // Order status breakdown with visualization
    const statusBreakdown = document.createElement('div');
    statusBreakdown.className = 'stats-section';
    
    const statusTitle = document.createElement('h3');
    statusTitle.textContent = 'Order Status Breakdown';
    statusBreakdown.appendChild(statusTitle);
    
    // Create a container for status visualization
    const statusVisualContainer = document.createElement('div');
    statusVisualContainer.className = 'stats-visual-container';
    statusBreakdown.appendChild(statusVisualContainer);
    
    // Create a bar chart for status
    const statusChartContainer = document.createElement('div');
    statusChartContainer.className = 'stats-chart-container';
    statusChartContainer.style.flex = '1';
    
    const statusCanvas = document.createElement('canvas');
    statusCanvas.id = 'orderStatusChart';
    statusCanvas.style.width = '100%';
    statusCanvas.style.height = '250px';
    statusChartContainer.appendChild(statusCanvas);
    statusVisualContainer.appendChild(statusChartContainer);
    
    // Create table container
    const statusTableContainer = document.createElement('div');
    statusTableContainer.className = 'stats-table-container';
    statusTableContainer.style.flex = '1';
    statusVisualContainer.appendChild(statusTableContainer);
    
    const statusTable = document.createElement('table');
    statusTable.className = 'stats-table';
    
    // Header
    const statusHeader = document.createElement('tr');
    statusHeader.innerHTML = `
        <th>Status</th>
        <th>Count</th>
    `;
    statusTable.appendChild(statusHeader);
    
    // Prepare data for status chart
    const statusLabels = [];
    const statusData = [];
    const statusColors = [
        'rgba(255, 99, 132, 0.7)',  // pending/new
        'rgba(255, 206, 86, 0.7)',  // preparing
        'rgba(54, 162, 235, 0.7)',  // ready
        'rgba(75, 192, 192, 0.7)',  // done
        'rgba(153, 102, 255, 0.7)', // delivered
        'rgba(255, 159, 64, 0.7)'   // cancelled
    ];
    
    // Create status rows and collect chart data
    for (const [status, count] of Object.entries(statusCounts)) {
        if (count > 0) {
            const row = document.createElement('tr');
            
            // Capitalize status
            const formattedStatus = status.charAt(0).toUpperCase() + status.slice(1);
            
            row.innerHTML = `
                <td>${formattedStatus}</td>
                <td>${count}</td>
            `;
            
            statusTable.appendChild(row);
            
            // Add to chart data
            statusLabels.push(formattedStatus);
            statusData.push(count);
        }
    }
    
    statusTableContainer.appendChild(statusTable);
    
    // Create status chart script
    const statusChartScript = document.createElement('script');
    statusChartScript.innerHTML = `
        setTimeout(() => {
            const statusCtx = document.getElementById('orderStatusChart');
            if (!statusCtx) return;
            
            new Chart(statusCtx, {
                type: 'bar',
                data: {
                    labels: ${JSON.stringify(statusLabels)},
                    datasets: [{
                        label: 'Number of Orders',
                        data: ${JSON.stringify(statusData)},
                        backgroundColor: ${JSON.stringify(statusColors.slice(0, statusLabels.length))},
                        borderColor: ${JSON.stringify(statusColors.slice(0, statusLabels.length).map(color => color.replace('0.7', '1')))},
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Orders by Status',
                            font: {
                                size: 16
                            }
                        },
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                precision: 0
                            }
                        }
                    }
                }
            });
        }, 100);
    `;
    
    statusBreakdown.appendChild(statusChartScript);
    statsContainer.appendChild(statusBreakdown);
    
    // Add hourly distribution chart
    // Group orders by hour
    const hourlyOrders = {};
    
    todaysOrders.forEach(order => {
        const data = order.data();
        const orderTime = data.orderTime && typeof data.orderTime === 'string' ? 
            new Date(data.orderTime) : 
            (data.orderTime && data.orderTime.toDate ? data.orderTime.toDate() : null);
        
        if (!orderTime) return;
        
        const hour = orderTime.getHours();
        
        // Initialize hour if not exists
        if (!hourlyOrders[hour]) {
            hourlyOrders[hour] = 0;
        }
        
        // Count order for this hour
        hourlyOrders[hour]++;
    });
    
    if (Object.keys(hourlyOrders).length > 0) {
        const hourlyBreakdown = document.createElement('div');
        hourlyBreakdown.className = 'stats-section';
        
        const hourlyTitle = document.createElement('h3');
        hourlyTitle.textContent = 'Hourly Order Distribution';
        hourlyBreakdown.appendChild(hourlyTitle);
        
        const hourlyChartContainer = document.createElement('div');
        hourlyChartContainer.className = 'stats-chart-container full-width';
        
        const hourlyCanvas = document.createElement('canvas');
        hourlyCanvas.id = 'hourlyOrdersChart';
        hourlyCanvas.style.width = '100%';
        hourlyCanvas.style.height = '250px';
        hourlyChartContainer.appendChild(hourlyCanvas);
        hourlyBreakdown.appendChild(hourlyChartContainer);
        
        // Create all 24 hours for a complete timeline
        const hourLabels = [];
        const hourData = [];
        
        for (let i = 0; i < 24; i++) {
            // Format hour as 12-hour with AM/PM
            let displayHour;
            if (i === 0) displayHour = '12 AM';
            else if (i < 12) displayHour = `${i} AM`;
            else if (i === 12) displayHour = '12 PM';
            else displayHour = `${i - 12} PM`;
            
            hourLabels.push(displayHour);
            hourData.push(hourlyOrders[i] || 0);
        }
        
        // Create hourly chart script
        const hourlyChartScript = document.createElement('script');
        hourlyChartScript.innerHTML = `
            setTimeout(() => {
                const hourlyCtx = document.getElementById('hourlyOrdersChart');
                if (!hourlyCtx) return;
                
                new Chart(hourlyCtx, {
                    type: 'line',
                    data: {
                        labels: ${JSON.stringify(hourLabels)},
                        datasets: [{
                            label: 'Orders per Hour',
                            data: ${JSON.stringify(hourData)},
                            backgroundColor: 'rgba(75, 192, 192, 0.2)',
                            borderColor: 'rgba(75, 192, 192, 1)',
                            borderWidth: 2,
                            tension: 0.2,
                            fill: true,
                            pointBackgroundColor: 'rgba(75, 192, 192, 1)',
                            pointRadius: 4,
                            pointHoverRadius: 6
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            title: {
                                display: true,
                                text: 'Orders Throughout the Day',
                                font: {
                                    size: 16
                                }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    precision: 0
                                }
                            }
                        }
                    }
                });
            }, 100);
        `;
        
        hourlyBreakdown.appendChild(hourlyChartScript);
        statsContainer.appendChild(hourlyBreakdown);
    }

    // Platform Performance Breakdown
    if (Object.keys(platformStats).length > 0) {
        const platformBreakdown = document.createElement('div');
        platformBreakdown.className = 'stats-section';

        const platformTitle = document.createElement('h3');
        platformTitle.textContent = 'Platform Performance';
        platformBreakdown.appendChild(platformTitle);

        const platformVisualContainer = document.createElement('div');
        platformVisualContainer.className = 'stats-visual-container';
        platformBreakdown.appendChild(platformVisualContainer);

        // Create chart container
        const platformChartContainer = document.createElement('div');
        platformChartContainer.className = 'stats-chart-container';
        platformChartContainer.style.flex = '1';

        const platformCanvas = document.createElement('canvas');
        platformCanvas.id = 'platformChart';
        platformCanvas.style.width = '100%';
        platformCanvas.style.height = '250px';
        platformChartContainer.appendChild(platformCanvas);
        platformVisualContainer.appendChild(platformChartContainer);

        // Create table container
        const platformTableContainer = document.createElement('div');
        platformTableContainer.className = 'stats-table-container';
        platformTableContainer.style.flex = '1';
        platformVisualContainer.appendChild(platformTableContainer);

        const platformTable = document.createElement('table');
        platformTable.className = 'stats-table';

        // Header
        const platformHeader = document.createElement('tr');
        platformHeader.innerHTML = `
            <th>Platform</th>
            <th>Orders</th>
            <th>Revenue</th>
            <th>Pizzas</th>
            <th>AOV</th>
        `;
        platformTable.appendChild(platformHeader);

        // Sort platforms by revenue
        const sortedPlatforms = Object.entries(platformStats)
            .sort((a, b) => b[1].revenue - a[1].revenue);

        // Prepare data for platform chart
        const platformLabels = [];
        const platformRevenueData = [];
        const platformOrdersData = [];
        const platformColors = [
            'rgba(255, 99, 132, 0.7)',
            'rgba(54, 162, 235, 0.7)',
            'rgba(255, 206, 86, 0.7)',
            'rgba(75, 192, 192, 0.7)',
            'rgba(153, 102, 255, 0.7)',
            'rgba(255, 159, 64, 0.7)'
        ];

        // Create table rows and collect chart data
        sortedPlatforms.forEach(([platform, stats]) => {
            const row = document.createElement('tr');
            const platformAOV = stats.orders > 0 ? stats.revenue / stats.orders : 0;

            row.innerHTML = `
                <td><strong>${platform}</strong></td>
                <td>${stats.orders}</td>
                <td>${formatCurrency(stats.revenue)}</td>
                <td>${stats.pizzas}</td>
                <td>${formatCurrency(platformAOV)}</td>
            `;

            platformTable.appendChild(row);

            // Add to chart data
            platformLabels.push(platform);
            platformRevenueData.push(stats.revenue);
            platformOrdersData.push(stats.orders);
        });

        platformTableContainer.appendChild(platformTable);

        // Create platform chart script
        const platformChartScript = document.createElement('script');
        platformChartScript.innerHTML = `
            setTimeout(() => {
                const platformCtx = document.getElementById('platformChart');
                if (!platformCtx) return;

                new Chart(platformCtx, {
                    type: 'bar',
                    data: {
                        labels: ${JSON.stringify(platformLabels)},
                        datasets: [{
                            label: 'Revenue',
                            data: ${JSON.stringify(platformRevenueData)},
                            backgroundColor: ${JSON.stringify(platformColors.slice(0, platformLabels.length))},
                            borderColor: ${JSON.stringify(platformColors.slice(0, platformLabels.length).map(color => color.replace('0.7', '1')))},
                            borderWidth: 1,
                            yAxisID: 'y'
                        }, {
                            label: 'Orders',
                            data: ${JSON.stringify(platformOrdersData)},
                            backgroundColor: 'rgba(201, 203, 207, 0.7)',
                            borderColor: 'rgba(201, 203, 207, 1)',
                            borderWidth: 1,
                            yAxisID: 'y1'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            title: {
                                display: true,
                                text: 'Revenue & Orders by Platform',
                                font: {
                                    size: 16
                                }
                            }
                        },
                        scales: {
                            y: {
                                type: 'linear',
                                display: true,
                                position: 'left',
                                title: {
                                    display: true,
                                    text: 'Revenue (R)'
                                }
                            },
                            y1: {
                                type: 'linear',
                                display: true,
                                position: 'right',
                                title: {
                                    display: true,
                                    text: 'Orders'
                                },
                                grid: {
                                    drawOnChartArea: false
                                }
                            }
                        }
                    }
                });
            }, 100);
        `;

        platformBreakdown.appendChild(platformChartScript);
        statsContainer.appendChild(platformBreakdown);
    }

    // Create pizza types breakdown
    // If we have pizza types, display breakdown with visualization
    if (Object.keys(pizzaTypes).length > 0) {
        const pizzaTypesBreakdown = document.createElement('div');
        pizzaTypesBreakdown.className = 'stats-section';
        
        const pizzaTypesTitle = document.createElement('h3');
        pizzaTypesTitle.textContent = 'Pizza Types Sold Today';
        pizzaTypesBreakdown.appendChild(pizzaTypesTitle);
        
        // Create chart and table container with flex layout
        const pizzaTypesVisualContainer = document.createElement('div');
        pizzaTypesVisualContainer.className = 'stats-visual-container';
        pizzaTypesBreakdown.appendChild(pizzaTypesVisualContainer);
        
        // Add pie chart for pizza distribution
        const pieChartContainer = document.createElement('div');
        pieChartContainer.className = 'stats-chart-container';
        pieChartContainer.style.flex = '1';
        
        const pieCanvas = document.createElement('canvas');
        pieCanvas.id = 'pizzaTypesPieChart';
        pieCanvas.style.width = '100%';
        pieCanvas.style.height = '300px';
        pieChartContainer.appendChild(pieCanvas);
        pizzaTypesVisualContainer.appendChild(pieChartContainer);
        
        // Create table container
        const tableContainer = document.createElement('div');
        tableContainer.className = 'stats-table-container';
        tableContainer.style.flex = '1';
        pizzaTypesVisualContainer.appendChild(tableContainer);
        
        const pizzaTypesTable = document.createElement('table');
        pizzaTypesTable.className = 'stats-table';
        
        // Create table header
        const header = document.createElement('tr');
        header.innerHTML = `
            <th>Pizza Type</th>
            <th>Quantity</th>
            <th>% of Total</th>
        `;
        pizzaTypesTable.appendChild(header);
        
        // Sort pizza types by quantity (descending)
        const sortedPizzaTypes = Object.entries(pizzaTypes)
            .sort((a, b) => b[1] - a[1]);
        
        // Prepare data for pie chart
        const pieLabels = [];
        const pieData = [];
        const pieColors = [
            'rgba(255, 99, 132, 0.8)',
            'rgba(54, 162, 235, 0.8)',
            'rgba(255, 206, 86, 0.8)',
            'rgba(75, 192, 192, 0.8)',
            'rgba(153, 102, 255, 0.8)',
            'rgba(255, 159, 64, 0.8)',
            'rgba(199, 199, 199, 0.8)',
            'rgba(83, 102, 255, 0.8)',
            'rgba(40, 159, 64, 0.8)',
            'rgba(210, 55, 86, 0.8)'
        ];
        
        // Create table rows and collect pie chart data
        sortedPizzaTypes.forEach(([type, quantity], index) => {
            const row = document.createElement('tr');
            const percentage = ((quantity / totalPizzas) * 100).toFixed(1);
            
            row.innerHTML = `
                <td>${type}</td>
                <td>${quantity}</td>
                <td>${percentage}%</td>
            `;
            
            pizzaTypesTable.appendChild(row);
            
            // Add data for pie chart (limit to top 8 for clarity)
            if (index < 8) {
                pieLabels.push(type);
                pieData.push(quantity);
            } else if (index === 8) {
                // Group remaining as "Other"
                pieLabels.push('Other');
                pieData.push(quantity);
            } else if (index > 8) {
                // Add to "Other"
                pieData[8] += quantity;
            }
        });
        
        tableContainer.appendChild(pizzaTypesTable);
        
        // Create pie chart script
        const pieChartScript = document.createElement('script');
        pieChartScript.innerHTML = `
            setTimeout(() => {
                const pieCtx = document.getElementById('pizzaTypesPieChart');
                if (!pieCtx) return;
                
                new Chart(pieCtx, {
                    type: 'pie',
                    data: {
                        labels: ${JSON.stringify(pieLabels)},
                        datasets: [{
                            data: ${JSON.stringify(pieData)},
                            backgroundColor: ${JSON.stringify(pieColors.slice(0, pieLabels.length))},
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'right',
                                labels: {
                                    boxWidth: 15,
                                    font: {
                                        size: 12
                                    }
                                }
                            },
                            title: {
                                display: true,
                                text: 'Pizza Types Distribution',
                                font: {
                                    size: 16
                                }
                            }
                        }
                    }
                });
            }, 100);
        `;
        
        pizzaTypesBreakdown.appendChild(pieChartScript);
        statsContainer.appendChild(pizzaTypesBreakdown);
    }
    
    // If we have ingredients, display usage with visualization
    if (Object.keys(ingredientsUsage).length > 0) {
        const ingredientsBreakdown = document.createElement('div');
        ingredientsBreakdown.className = 'stats-section';
        
        const ingredientsTitle = document.createElement('h3');
        ingredientsTitle.textContent = 'Ingredients Used Today';
        ingredientsBreakdown.appendChild(ingredientsTitle);
        
        // Create visualization container
        const ingredientsVisualContainer = document.createElement('div');
        ingredientsVisualContainer.className = 'stats-visual-container';
        ingredientsBreakdown.appendChild(ingredientsVisualContainer);
        
        // Create chart container
        const ingredientsChartContainer = document.createElement('div');
        ingredientsChartContainer.className = 'stats-chart-container';
        ingredientsChartContainer.style.flex = '1';
        
        const ingredientsCanvas = document.createElement('canvas');
        ingredientsCanvas.id = 'ingredientsChart';
        ingredientsCanvas.style.width = '100%';
        ingredientsCanvas.style.height = '300px';
        ingredientsChartContainer.appendChild(ingredientsCanvas);
        ingredientsVisualContainer.appendChild(ingredientsChartContainer);
        
        // Create table container
        const ingredientsTableContainer = document.createElement('div');
        ingredientsTableContainer.className = 'stats-table-container';
        ingredientsTableContainer.style.flex = '1';
        ingredientsVisualContainer.appendChild(ingredientsTableContainer);
        
        const ingredientsTable = document.createElement('div');
        ingredientsTable.className = 'stats-table ingredients-table';
        ingredientsTableContainer.appendChild(ingredientsTable);
        
        // Sort ingredients by usage (descending)
        const sortedIngredients = Object.values(ingredientsUsage)
            .sort((a, b) => b.amount - a.amount);
        
        // Prepare data for ingredients chart (top 10 only for clarity)
        const ingredientLabels = [];
        const ingredientData = [];
        const ingredientColors = [
            'rgba(255, 99, 132, 0.7)',
            'rgba(54, 162, 235, 0.7)',
            'rgba(255, 206, 86, 0.7)',
            'rgba(75, 192, 192, 0.7)',
            'rgba(153, 102, 255, 0.7)',
            'rgba(255, 159, 64, 0.7)',
            'rgba(199, 199, 199, 0.7)',
            'rgba(83, 102, 255, 0.7)',
            'rgba(40, 159, 64, 0.7)',
            'rgba(210, 55, 86, 0.7)'
        ];
        
        // Create table rows and collect chart data
        sortedIngredients.forEach((ingredient, index) => {
            const ingredientRow = document.createElement('div');
            ingredientRow.className = 'stats-table-row';
            
            const ingredientName = document.createElement('div');
            ingredientName.className = 'stats-table-cell stats-table-name';
            ingredientName.textContent = ingredient.name;
                
            const ingredientCount = document.createElement('div');
            ingredientCount.className = 'stats-table-cell stats-table-count';
            ingredientCount.textContent = `${ingredient.amount.toFixed(0)} ${ingredient.unit}`;
            
            ingredientRow.appendChild(ingredientName);
            ingredientRow.appendChild(ingredientCount);
            ingredientsTable.appendChild(ingredientRow);
            
            // Add top 10 ingredients to chart
            if (index < 10) {
                ingredientLabels.push(ingredient.name);
                ingredientData.push(ingredient.amount);
            }
        });
        
        // Create ingredients chart script
        const ingredientsChartScript = document.createElement('script');
        ingredientsChartScript.innerHTML = `
            setTimeout(() => {
                const ingredientsCtx = document.getElementById('ingredientsChart');
                if (!ingredientsCtx) return;
                
                new Chart(ingredientsCtx, {
                    type: 'horizontalBar',
                    data: {
                        labels: ${JSON.stringify(ingredientLabels)},
                        datasets: [{
                            label: 'Amount Used',
                            data: ${JSON.stringify(ingredientData)},
                            backgroundColor: ${JSON.stringify(ingredientColors.slice(0, ingredientLabels.length))},
                            borderColor: ${JSON.stringify(ingredientColors.slice(0, ingredientLabels.length).map(color => color.replace('0.7', '1')))},
                            borderWidth: 1
                        }]
                    },
                    options: {
                        indexAxis: 'y',
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            title: {
                                display: true,
                                text: 'Top Ingredients Used (by quantity)',
                                font: {
                                    size: 16
                                }
                            },
                            legend: {
                                display: false
                            }
                        },
                        scales: {
                            x: {
                                beginAtZero: true
                            }
                        }
                    }
                });
            }, 100);
        `;
        
        ingredientsBreakdown.appendChild(ingredientsChartScript);
        statsContainer.appendChild(ingredientsBreakdown);
    }

    // Add export button
    const exportContainer = document.createElement('div');
    exportContainer.className = 'export-container';
    exportContainer.innerHTML = `
        <button id="exportStatsBtn" class="export-btn">
            <span class="material-icons">download</span>
            Export Daily Report (CSV)
        </button>
    `;
    statsContainer.appendChild(exportContainer);

    ordersContainer.appendChild(statsContainer);
    updateLastUpdated();

    // Setup date navigation event listeners
    setupDateNavigation(allOrders, targetDate);

    // Setup export functionality
    document.getElementById('exportStatsBtn')?.addEventListener('click', () => {
        exportDailyStats(todaysOrders, targetDate, {
            totalOrders: todaysOrders.length,
            totalPizzas,
            totalRevenue,
            avgOrderValue,
            totalLateOrders,
            platformStats,
            pizzaTypes
        });
    });
}

// Setup date navigation event listeners
function setupDateNavigation(allOrders, currentDate) {
    const datePicker = document.getElementById('statsDatePicker');
    const prevBtn = document.getElementById('prevDayBtn');
    const todayBtn = document.getElementById('todayBtn');
    const nextBtn = document.getElementById('nextDayBtn');

    if (datePicker) {
        datePicker.addEventListener('change', (e) => {
            const selectedDate = new Date(e.target.value + 'T00:00:00');
            ordersContainer.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading statistics...</p></div>';
            setTimeout(() => displayStatistics(allOrders, selectedDate), 100);
        });
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            const prevDate = new Date(currentDate);
            prevDate.setDate(prevDate.getDate() - 1);
            ordersContainer.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading statistics...</p></div>';
            setTimeout(() => displayStatistics(allOrders, prevDate), 100);
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            const nextDate = new Date(currentDate);
            nextDate.setDate(nextDate.getDate() + 1);
            ordersContainer.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading statistics...</p></div>';
            setTimeout(() => displayStatistics(allOrders, nextDate), 100);
        });
    }

    if (todayBtn) {
        todayBtn.addEventListener('click', () => {
            ordersContainer.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading statistics...</p></div>';
            setTimeout(() => displayStatistics(allOrders, new Date()), 100);
        });
    }
}

// Export daily statistics to CSV
function exportDailyStats(orders, date, summary) {
    const dateStr = date.toISOString().split('T')[0];
    let csv = `John Dough's Illovo - Daily Report\n`;
    csv += `Date: ${date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n\n`;

    // Summary section
    csv += `SUMMARY\n`;
    csv += `Total Orders,${summary.totalOrders}\n`;
    csv += `Total Pizzas Sold,${summary.totalPizzas}\n`;
    csv += `Total Revenue,${summary.totalRevenue.toFixed(2)}\n`;
    csv += `Average Order Value,${summary.avgOrderValue.toFixed(2)}\n`;
    csv += `Late Orders,${summary.totalLateOrders}\n\n`;

    // Platform breakdown
    csv += `PLATFORM PERFORMANCE\n`;
    csv += `Platform,Orders,Revenue,Pizzas,AOV\n`;
    Object.entries(summary.platformStats).forEach(([platform, stats]) => {
        const aov = stats.orders > 0 ? (stats.revenue / stats.orders).toFixed(2) : '0.00';
        csv += `${platform},${stats.orders},${stats.revenue.toFixed(2)},${stats.pizzas},${aov}\n`;
    });
    csv += `\n`;

    // Pizza types breakdown
    csv += `PIZZA TYPES\n`;
    csv += `Pizza Type,Quantity,Percentage\n`;
    Object.entries(summary.pizzaTypes)
        .sort((a, b) => b[1] - a[1])
        .forEach(([type, quantity]) => {
            const percentage = ((quantity / summary.totalPizzas) * 100).toFixed(1);
            csv += `${type},${quantity},${percentage}%\n`;
        });
    csv += `\n`;

    // Individual orders
    csv += `DETAILED ORDERS\n`;
    csv += `Order Time,Customer,Platform,Status,Amount,Pizzas,Special Instructions\n`;
    orders.forEach(order => {
        const data = order.data();
        const orderTime = data.orderTime && typeof data.orderTime === 'string' ?
            new Date(data.orderTime) :
            (data.orderTime && data.orderTime.toDate ? data.orderTime.toDate() : new Date());
        const timeStr = orderTime.toLocaleTimeString();
        const pizzaCount = data.pizzas ? data.pizzas.reduce((sum, p) => sum + (p.quantity || 1), 0) : 0;
        const specialInst = data.hasSpecialInstructions ? 'Yes' : 'No';

        csv += `${timeStr},"${data.customerName || 'Unknown'}",${data.platform || 'Unknown'},${data.status || 'Unknown'},${(data.totalAmount || 0).toFixed(2)},${pizzaCount},${specialInst}\n`;
    });

    // Create download link
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `john-doughs-illovo-${dateStr}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Display monthly statistics
function displayMonthlyStatistics(allOrders) {
    // Create stats container
    const statsContainer = document.createElement('div');
    statsContainer.className = 'stats-container';
    
    // Get current month and year
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Get previous month and year
    let prevMonth = currentMonth - 1;
    let prevYear = currentYear;
    if (prevMonth < 0) {
        prevMonth = 11; // December
        prevYear = currentYear - 1;
    }
    
    // Create month selector
    const monthSelector = document.createElement('div');
    monthSelector.className = 'month-selector';
    monthSelector.innerHTML = `
        <label for="monthSelect">Select Month: </label>
        <select id="monthSelect">
            <option value="current" selected>Current Month (${new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long' })} ${currentYear})</option>
            <option value="previous">Previous Month (${new Date(prevYear, prevMonth).toLocaleString('default', { month: 'long' })} ${prevYear})</option>
        </select>
    `;
    statsContainer.appendChild(monthSelector);
    
    // Create container for stats content that will be updated based on selection
    const statsContent = document.createElement('div');
    statsContent.id = 'monthlyStatsContent';
    statsContainer.appendChild(statsContent);
    
    // Function to render stats for a specific month
    const renderMonthStats = (targetMonth, targetYear) => {
        // Clear previous content
        statsContent.innerHTML = '';
        
        // Filter orders for the selected month
        const monthlyOrders = allOrders.filter(order => {
            const data = order.data();
            const orderTime = data.orderTime && typeof data.orderTime === 'string' ? 
                new Date(data.orderTime) : 
                (data.orderTime && data.orderTime.toDate ? data.orderTime.toDate() : null);
            
            if (!orderTime) return false;
            
            const orderDate = new Date(orderTime);
            
            // Check if same month and year
            return orderDate.getMonth() === targetMonth && orderDate.getFullYear() === targetYear;
        });
        
        // Create month display
        const dateDisplay = document.createElement('div');
        dateDisplay.className = 'stats-date';
        dateDisplay.textContent = new Date(targetYear, targetMonth, 1).toLocaleDateString(undefined, { 
            year: 'numeric', month: 'long'
        });
        statsContent.appendChild(dateDisplay);
        
        // If no orders for this month
        if (monthlyOrders.length === 0) {
            const noData = document.createElement('div');
            noData.className = 'no-orders';
            noData.innerHTML = `<p>No pizza orders found for this month.</p>`;
            statsContent.appendChild(noData);
            return;
        }
        
        // Group orders by day of month
        const ordersByDay = {};
        const pizzaTypesByDay = {};
        let monthlyTotalPizzas = 0;
        let monthlyTotalRevenue = 0;
        let monthlyTotalOrders = monthlyOrders.length;
        let bestSellingPizza = { type: 'None', count: 0 };
        let pizzaTypes = {};
        
        monthlyOrders.forEach(order => {
            const data = order.data();
            const orderTime = data.orderTime && typeof data.orderTime === 'string' ? 
                new Date(data.orderTime) : 
                (data.orderTime && data.orderTime.toDate ? data.orderTime.toDate() : null);
            
            if (!orderTime) return;
            
            const orderDate = new Date(orderTime);
            const dayOfMonth = orderDate.getDate();
            
            // Initialize day if not exists
            if (!ordersByDay[dayOfMonth]) {
                ordersByDay[dayOfMonth] = {
                    orders: 0,
                    revenue: 0,
                    pizzas: 0
                };
            }
            
            // Initialize pizza types by day
            if (!pizzaTypesByDay[dayOfMonth]) {
                pizzaTypesByDay[dayOfMonth] = {};
            }
            
            // Count order for this day
            ordersByDay[dayOfMonth].orders++;
            
            // Add revenue
            const revenue = Number(data.totalAmount) || 0;
            ordersByDay[dayOfMonth].revenue += revenue;
            monthlyTotalRevenue += revenue;
            
            // Count pizzas
            if (data.pizzas && Array.isArray(data.pizzas)) {
                data.pizzas.forEach(pizza => {
                    const quantity = pizza.quantity || 1;
                    const pizzaType = pizza.pizzaType || 'Unknown';
                    
                    // Add to daily count
                    ordersByDay[dayOfMonth].pizzas += quantity;
                    
                    // Add to pizza types by day
                    if (!pizzaTypesByDay[dayOfMonth][pizzaType]) {
                        pizzaTypesByDay[dayOfMonth][pizzaType] = 0;
                    }
                    pizzaTypesByDay[dayOfMonth][pizzaType] += quantity;
                    
                    // Add to monthly count
                    monthlyTotalPizzas += quantity;
                    
                    // Track best-selling pizza
                    if (!pizzaTypes[pizzaType]) pizzaTypes[pizzaType] = 0;
                    pizzaTypes[pizzaType] += quantity;
                    
                    if (pizzaTypes[pizzaType] > bestSellingPizza.count) {
                        bestSellingPizza = {
                            type: pizzaType,
                            count: pizzaTypes[pizzaType]
                        };
                    }
                });
            }
        });
        
        // Create summary cards for the month
        const summaryCardsContainer = document.createElement('div');
        summaryCardsContainer.className = 'stats-summary-cards';
        
        // Orders this month
        summaryCardsContainer.appendChild(
            createStatCard('Monthly Orders', monthlyTotalOrders, 'receipt_long', 'primary')
        );
        
        // Total pizzas this month
        summaryCardsContainer.appendChild(
            createStatCard('Monthly Pizzas', monthlyTotalPizzas, 'local_pizza')
        );
        
        // Total revenue this month
        summaryCardsContainer.appendChild(
            createStatCard('Monthly Revenue', formatCurrency(monthlyTotalRevenue), 'payments', 'success')
        );
        
        // Best-selling pizza
        summaryCardsContainer.appendChild(
            createStatCard('Best Seller', bestSellingPizza.type, 'star', 'warning')
        );
        
        statsContent.appendChild(summaryCardsContainer);
        
        // Create daily breakdown
        const dailyBreakdownContainer = document.createElement('div');
        dailyBreakdownContainer.className = 'stats-section';
        
        const dailyBreakdownTitle = document.createElement('h3');
        dailyBreakdownTitle.textContent = 'Daily Breakdown';
        dailyBreakdownContainer.appendChild(dailyBreakdownTitle);
        
        // Create chart container
        const chartContainer = document.createElement('div');
        chartContainer.className = 'stats-chart-container';
        
        // Create chart
        const chartCanvas = document.createElement('canvas');
        chartCanvas.id = 'dailySalesChart';
        chartCanvas.style.width = '100%';
        chartCanvas.style.height = '300px';
        chartContainer.appendChild(chartCanvas);
        
        dailyBreakdownContainer.appendChild(chartContainer);
        
        // Create a table for daily data
        const table = document.createElement('table');
        table.className = 'stats-table';
        
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th>Day</th>
                <th>Orders</th>
                <th>Pizzas</th>
                <th>Revenue</th>
                <th>Top Pizza</th>
            </tr>
        `;
        table.appendChild(thead);
        
        const tbody = document.createElement('tbody');
        
        // Sort days numerically
        const sortedDays = Object.keys(ordersByDay).sort((a, b) => parseInt(a) - parseInt(b));
        
        // Prepare data for chart
        const chartLabels = [];
        const orderData = [];
        const revenueData = [];
        const pizzaData = [];
        
        sortedDays.forEach(day => {
            const dayData = ordersByDay[day];
            
            // Add to chart data
            chartLabels.push(day);
            orderData.push(dayData.orders);
            revenueData.push(dayData.revenue);
            pizzaData.push(dayData.pizzas);
            
            // Find top pizza for this day
            let topPizza = { type: 'None', count: 0 };
            const pizzasForDay = pizzaTypesByDay[day];
            
            for (const [type, count] of Object.entries(pizzasForDay)) {
                if (count > topPizza.count) {
                    topPizza = { type, count };
                }
            }
            
            // Create table row
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${day}</td>
                <td>${dayData.orders}</td>
                <td>${dayData.pizzas}</td>
                <td>${formatCurrency(dayData.revenue)}</td>
                <td>${topPizza.type} (${topPizza.count})</td>
            `;
            
            tbody.appendChild(tr);
        });
        
        table.appendChild(tbody);
        dailyBreakdownContainer.appendChild(table);
        
        statsContent.appendChild(dailyBreakdownContainer);
        
        // Add chart script to visualize the data
        const chartScript = document.createElement('script');
        chartScript.innerHTML = `
            // Wait for the canvas to be in the DOM
            setTimeout(() => {
                const canvas = document.getElementById('dailySalesChart');
                if (!canvas) return;
                
                const ctx = canvas.getContext('2d');
                new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: ${JSON.stringify(chartLabels)},
                        datasets: [
                            {
                                label: 'Pizzas',
                                data: ${JSON.stringify(pizzaData)},
                                backgroundColor: 'rgba(255, 99, 132, 0.5)',
                                borderColor: 'rgb(255, 99, 132)',
                                borderWidth: 1
                            },
                            {
                                label: 'Orders',
                                data: ${JSON.stringify(orderData)},
                                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                                borderColor: 'rgb(54, 162, 235)',
                                borderWidth: 1
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        scales: {
                            y: {
                                beginAtZero: true
                            }
                        }
                    }
                });
            }, 100);
        `;
        
        // Add additional visualizations
        
        // 1. Pizza Types Distribution (Pie Chart)
        const pizzaTypesContainer = document.createElement('div');
        pizzaTypesContainer.className = 'stats-section';
        
        const pizzaTypesTitle = document.createElement('h3');
        pizzaTypesTitle.textContent = 'Pizza Types Distribution';
        pizzaTypesContainer.appendChild(pizzaTypesTitle);
        
        const pizzaChartContainer = document.createElement('div');
        pizzaChartContainer.className = 'visualization-container';
        
        // Create chart and table side by side
        const pizzaChartWrapper = document.createElement('div');
        pizzaChartWrapper.className = 'chart-wrapper';
        
        const pizzaChartCanvas = document.createElement('canvas');
        pizzaChartCanvas.id = 'monthlyPizzaTypesChart';
        pizzaChartWrapper.appendChild(pizzaChartCanvas);
        
        pizzaChartContainer.appendChild(pizzaChartWrapper);
        
        // Create a table for pizza types
        const pizzaTable = document.createElement('div');
        pizzaTable.className = 'data-table';
        
        const pizzaTableHeader = document.createElement('div');
        pizzaTableHeader.className = 'table-header';
        pizzaTableHeader.innerHTML = '<div>Pizza Type</div><div>Quantity</div><div>Percentage</div>';
        pizzaTable.appendChild(pizzaTableHeader);
        
        // Prepare data for pizza types pie chart
        const pizzaChartData = [];
        const pizzaChartColors = [
            'rgba(255, 99, 132, 0.8)',
            'rgba(54, 162, 235, 0.8)',
            'rgba(255, 206, 86, 0.8)',
            'rgba(75, 192, 192, 0.8)',
            'rgba(153, 102, 255, 0.8)',
            'rgba(255, 159, 64, 0.8)',
            'rgba(199, 199, 199, 0.8)',
            'rgba(83, 102, 255, 0.8)',
        ];
        
        // Sort pizza types by quantity
        const sortedPizzaTypes = Object.entries(pizzaTypes)
            .sort((a, b) => b[1] - a[1]);
        
        // Limit to top 8 types, group others as "Other"
        let otherCount = 0;
        sortedPizzaTypes.forEach((entry, index) => {
            const [type, count] = entry;
            const percentage = (count / monthlyTotalPizzas * 100).toFixed(1);
            
            // Create table row for each pizza type
            const tableRow = document.createElement('div');
            tableRow.className = 'table-row';
            tableRow.innerHTML = `<div>${type}</div><div>${count}</div><div>${percentage}%</div>`;
            pizzaTable.appendChild(tableRow);
            
            // Add to chart data (top 8 or group as Other)
            if (index < 8) {
                pizzaChartData.push({
                    label: type,
                    count: count,
                    color: pizzaChartColors[index % pizzaChartColors.length]
                });
            } else {
                otherCount += count;
            }
        });
        
        // Add "Other" category if needed
        if (otherCount > 0) {
            const percentage = (otherCount / monthlyTotalPizzas * 100).toFixed(1);
            const tableRow = document.createElement('div');
            tableRow.className = 'table-row';
            tableRow.innerHTML = `<div>Other</div><div>${otherCount}</div><div>${percentage}%</div>`;
            pizzaTable.appendChild(tableRow);
            
            pizzaChartData.push({
                label: 'Other',
                count: otherCount,
                color: 'rgba(169, 169, 169, 0.8)'
            });
        }
        
        pizzaChartContainer.appendChild(pizzaTable);
        pizzaTypesContainer.appendChild(pizzaChartContainer);
        statsContent.appendChild(pizzaTypesContainer);
        
        // 2. Order Status Breakdown (Bar Chart)
        const orderStatusContainer = document.createElement('div');
        orderStatusContainer.className = 'stats-section';
        
        const orderStatusTitle = document.createElement('h3');
        orderStatusTitle.textContent = 'Order Status Breakdown';
        orderStatusContainer.appendChild(orderStatusTitle);
        
        const statusChartContainer = document.createElement('div');
        statusChartContainer.className = 'visualization-container';
        
        const statusChartWrapper = document.createElement('div');
        statusChartWrapper.className = 'chart-wrapper';
        
        const statusChartCanvas = document.createElement('canvas');
        statusChartCanvas.id = 'monthlyOrderStatusChart';
        statusChartWrapper.appendChild(statusChartCanvas);
        
        statusChartContainer.appendChild(statusChartWrapper);
        
        // Count orders by status
        const orderStatusCounts = {};
        monthlyOrders.forEach(order => {
            const data = order.data();
            const status = data.status ? data.status.toLowerCase() : 'unknown';
            
            if (!orderStatusCounts[status]) {
                orderStatusCounts[status] = 0;
            }
            orderStatusCounts[status]++;
        });
        
        // Create table for order status
        const statusTable = document.createElement('div');
        statusTable.className = 'data-table';
        
        const statusTableHeader = document.createElement('div');
        statusTableHeader.className = 'table-header';
        statusTableHeader.innerHTML = '<div>Status</div><div>Count</div><div>Percentage</div>';
        statusTable.appendChild(statusTableHeader);
        
        // Prepare data for order status chart
        const statusChartData = [];
        const statusChartColors = {
            'delivered': 'rgba(40, 167, 69, 0.8)',
            'preparing': 'rgba(255, 193, 7, 0.8)',
            'pending': 'rgba(0, 123, 255, 0.8)',
            'cancelled': 'rgba(220, 53, 69, 0.8)',
            'unknown': 'rgba(108, 117, 125, 0.8)'
        };
        
        Object.entries(orderStatusCounts).forEach(([status, count]) => {
            const percentage = (count / monthlyTotalOrders * 100).toFixed(1);
            
            // Add to table
            const tableRow = document.createElement('div');
            tableRow.className = 'table-row';
            tableRow.innerHTML = `<div>${status.charAt(0).toUpperCase() + status.slice(1)}</div><div>${count}</div><div>${percentage}%</div>`;
            statusTable.appendChild(tableRow);
            
            // Add to chart data
            statusChartData.push({
                label: status.charAt(0).toUpperCase() + status.slice(1),
                count: count,
                color: statusChartColors[status] || 'rgba(108, 117, 125, 0.8)'
            });
        });
        
        statusChartContainer.appendChild(statusTable);
        orderStatusContainer.appendChild(statusChartContainer);
        statsContent.appendChild(orderStatusContainer);
        
        // 3. Hourly Order Distribution (Line Chart)
        const hourlyContainer = document.createElement('div');
        hourlyContainer.className = 'stats-section';
        
        const hourlyTitle = document.createElement('h3');
        hourlyTitle.textContent = 'Hourly Order Distribution';
        hourlyContainer.appendChild(hourlyTitle);
        
        const hourlyChartContainer = document.createElement('div');
        hourlyChartContainer.className = 'chart-container';
        
        const hourlyChartCanvas = document.createElement('canvas');
        hourlyChartCanvas.id = 'monthlyHourlyChart';
        hourlyChartContainer.appendChild(hourlyChartCanvas);
        
        hourlyContainer.appendChild(hourlyChartContainer);
        
        // Count orders by hour
        const hourlyOrderCounts = Array(24).fill(0);
        
        monthlyOrders.forEach(order => {
            const data = order.data();
            const orderTime = data.orderTime && typeof data.orderTime === 'string' ? 
                new Date(data.orderTime) : 
                (data.orderTime && data.orderTime.toDate ? data.orderTime.toDate() : null);
            
            if (orderTime) {
                const hour = orderTime.getHours();
                hourlyOrderCounts[hour]++;
            }
        });
        
        statsContent.appendChild(hourlyContainer);
        
        // 4. Ingredients Usage (Horizontal Bar Chart)
        const ingredientsContainer = document.createElement('div');
        ingredientsContainer.className = 'stats-section';
        
        const ingredientsTitle = document.createElement('h3');
        ingredientsTitle.textContent = 'Ingredients Usage';
        ingredientsContainer.appendChild(ingredientsTitle);
        
        const ingredientsChartContainer = document.createElement('div');
        ingredientsChartContainer.className = 'visualization-container';
        
        const ingredientsChartWrapper = document.createElement('div');
        ingredientsChartWrapper.className = 'chart-wrapper';
        
        const ingredientsChartCanvas = document.createElement('canvas');
        ingredientsChartCanvas.id = 'monthlyIngredientsChart';
        ingredientsChartWrapper.appendChild(ingredientsChartCanvas);
        
        ingredientsChartContainer.appendChild(ingredientsChartWrapper);
        
        // Count ingredients
        const ingredientCounts = {};
        
        monthlyOrders.forEach(order => {
            const data = order.data();
            if (data.pizzas && Array.isArray(data.pizzas)) {
                data.pizzas.forEach(pizza => {
                    const quantity = pizza.quantity || 1;
                    const pizzaType = pizza.pizzaType || 'Unknown';
                    
                    // Get ingredients for this pizza type from the global pizzaIngredients object
                    if (pizzaIngredients[pizzaType]) {
                        pizzaIngredients[pizzaType].forEach(ingredient => {
                            if (!ingredientCounts[ingredient.name]) {
                                ingredientCounts[ingredient.name] = 0;
                            }
                            ingredientCounts[ingredient.name] += ingredient.amount * quantity;
                        });
                    }
                });
            }
        });
        
        // Create table for ingredients
        const ingredientsTable = document.createElement('div');
        ingredientsTable.className = 'data-table';
        
        const ingredientsTableHeader = document.createElement('div');
        ingredientsTableHeader.className = 'table-header';
        ingredientsTableHeader.innerHTML = '<div>Ingredient</div><div>Amount Used</div>';
        ingredientsTable.appendChild(ingredientsTableHeader);
        
        // Sort ingredients by usage and limit to top 10
        const sortedIngredients = Object.entries(ingredientCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
        
        sortedIngredients.forEach(([ingredient, amount]) => {
            const tableRow = document.createElement('div');
            tableRow.className = 'table-row';
            tableRow.innerHTML = `<div>${ingredient}</div><div>${amount.toFixed(1)} units</div>`;
            ingredientsTable.appendChild(tableRow);
        });
        
        ingredientsChartContainer.appendChild(ingredientsTable);
        ingredientsContainer.appendChild(ingredientsChartContainer);
        statsContent.appendChild(ingredientsContainer);
        
        // Add all chart scripts at once
        const allChartsScript = document.createElement('script');
        allChartsScript.innerHTML = `
            setTimeout(() => {
                // Pizza Types Pie Chart
                const pizzaCtx = document.getElementById('monthlyPizzaTypesChart').getContext('2d');
                new Chart(pizzaCtx, {
                    type: 'pie',
                    data: {
                        labels: ${JSON.stringify(pizzaChartData.map(item => item.label))},
                        datasets: [{
                            data: ${JSON.stringify(pizzaChartData.map(item => item.count))},
                            backgroundColor: ${JSON.stringify(pizzaChartData.map(item => item.color))},
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            legend: {
                                position: 'right'
                            }
                        }
                    }
                });
                
                // Order Status Bar Chart
                const statusCtx = document.getElementById('monthlyOrderStatusChart').getContext('2d');
                new Chart(statusCtx, {
                    type: 'bar',
                    data: {
                        labels: ${JSON.stringify(statusChartData.map(item => item.label))},
                        datasets: [{
                            label: 'Order Count',
                            data: ${JSON.stringify(statusChartData.map(item => item.count))},
                            backgroundColor: ${JSON.stringify(statusChartData.map(item => item.color))},
                            borderColor: ${JSON.stringify(statusChartData.map(item => item.color).map(color => color.replace('0.8', '1')))},
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    stepSize: 1
                                }
                            }
                        }
                    }
                });
                
                // Hourly Distribution Line Chart
                const hourlyCtx = document.getElementById('monthlyHourlyChart').getContext('2d');
                new Chart(hourlyCtx, {
                    type: 'line',
                    data: {
                        labels: Array.from({length: 24}, (_, i) => i + ':00'),
                        datasets: [{
                            label: 'Orders',
                            data: ${JSON.stringify(hourlyOrderCounts)},
                            borderColor: 'rgba(75, 192, 192, 1)',
                            backgroundColor: 'rgba(75, 192, 192, 0.2)',
                            borderWidth: 2,
                            fill: true,
                            tension: 0.1
                        }]
                    },
                    options: {
                        responsive: true,
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    stepSize: 1
                                }
                            },
                            x: {
                                title: {
                                    display: true,
                                    text: 'Hour of Day'
                                }
                            }
                        }
                    }
                });
                
                // Ingredients Horizontal Bar Chart
                const ingredientsCtx = document.getElementById('monthlyIngredientsChart').getContext('2d');
                new Chart(ingredientsCtx, {
                    type: 'bar',
                    data: {
                        labels: ${JSON.stringify(sortedIngredients.map(item => item[0]))},
                        datasets: [{
                            label: 'Amount Used',
                            data: ${JSON.stringify(sortedIngredients.map(item => item[1]))},
                            backgroundColor: 'rgba(153, 102, 255, 0.7)',
                            borderColor: 'rgba(153, 102, 255, 1)',
                            borderWidth: 1
                        }]
                    },
                    options: {
                        indexAxis: 'y',
                        responsive: true,
                        scales: {
                            x: {
                                beginAtZero: true
                            }
                        }
                    }
                });
            }, 100);
        `;
        
        statsContent.appendChild(allChartsScript);
        statsContent.appendChild(chartScript);
    };
    
    // Initial render with current month
    renderMonthStats(currentMonth, currentYear);
    
    // Add event listener for month selector
    setTimeout(() => {
        const monthSelect = document.getElementById('monthSelect');
        if (monthSelect) {
            monthSelect.addEventListener('change', function() {
                if (this.value === 'current') {
                    renderMonthStats(currentMonth, currentYear);
                } else {
                    renderMonthStats(prevMonth, prevYear);
                }
            });
        }
    }, 0);
    
    ordersContainer.appendChild(statsContainer);
    updateLastUpdated();
}

// Helper function to create a statistics card
function createStatCard(title, value, icon, extraClass = '') {
    const card = document.createElement('div');
    card.className = `stats-card ${extraClass}`;
    
    const iconElement = document.createElement('span');
    iconElement.className = 'material-icons stats-card-icon';
    iconElement.textContent = icon; // Using material icons
    
    const valueElement = document.createElement('div');
    valueElement.className = 'stats-card-value';
    valueElement.textContent = value;
    
    const titleElement = document.createElement('div');
    titleElement.className = 'stats-card-title';
    titleElement.textContent = title;
    
    card.appendChild(iconElement);
    card.appendChild(valueElement);
    card.appendChild(titleElement);
    
    return card;
}

// Fetch orders from Firestore
function fetchOrders() {
    debugLog('Attempting to fetch orders...');
    
    // Show loading indicator
    ordersContainer.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>Loading pizza orders...</p>
        </div>
    `;
    
    // Check if Firebase is properly initialized
    if (typeof firebase === 'undefined') {
        debugLog('Firebase SDK not loaded when trying to fetch orders', 'error');
        ordersContainer.innerHTML = `
            <div class="no-orders">
                <h3>⚠️ Firebase Not Loaded</h3>
                <p>Firebase SDK is not loaded. Please check your internet connection and refresh the page.</p>
            </div>
        `;
        return;
    }
    
    if (!db) {
        debugLog('Firestore database not initialized when trying to fetch orders', 'error');
        ordersContainer.innerHTML = `
            <div class="no-orders">
                <h3>⚠️ Database Not Initialized</h3>
                <p>Firestore database is not properly initialized. Please check console for errors.</p>
                <button onclick="location.reload()">Retry</button>
            </div>
        `;
        return;
    }
    
    try {
        debugLog('Creating Firestore query to fetch orders');
        const query = db.collection('orders')
            .orderBy('orderTime', 'desc')
            .limit(100); // Increased limit to 100 orders
        
        debugLog('Executing Firestore query...');
        query.get().then(snapshot => {
            debugLog(`Orders fetched successfully: ${snapshot.size} orders retrieved`);
            orders = snapshot.docs;
            const filteredOrders = filterOrdersByStatus(currentTab);
            displayOrders(filteredOrders);
        }).catch(error => {
            debugLog(`Error fetching orders: ${error.message}`, 'error');
            if (error.code === 'permission-denied') {
                showErrorState('permissionDenied');
            } else if (error.code === 'unavailable' || error.message.includes('network')) {
                showErrorState('networkError');
            } else {
                showErrorState('default', { message: error.message });
            }
        });
    } catch (e) {
        debugLog(`Fatal error accessing Firestore: ${e.message}`, 'error');
        showErrorState('default', { message: `Connection error: ${e.message}` });
    }
}

// Set up real-time listener
function setupRealTimeListener() {
    if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
    }
    
    const query = db.collection('orders')
        .orderBy('orderTime', 'desc')
        .limit(100); // Increased limit to 100 orders
    
    unsubscribe = query.onSnapshot(snapshot => {
        orders = snapshot.docs;
        const filteredOrders = filterOrdersByStatus(currentTab);
        displayOrders(filteredOrders);
    }, error => {
        console.error('Error in real-time updates:', error);
        ordersContainer.innerHTML = `
            <div class="no-orders">
                Error with live updates: ${error.message}
            </div>
        `;
    });
}

// Event Listeners
realtimeToggle.addEventListener('change', function() {
    if (this.checked) {
        setupRealTimeListener();
    } else {
        if (unsubscribe) {
            unsubscribe();
            unsubscribe = null;
        }
        fetchOrders();
    }
});

refreshButton.addEventListener('click', function() {
    if (realtimeToggle.checked) {
        const alertMessage = document.createElement('div');
        alertMessage.className = 'alert-message';
        alertMessage.textContent = 'Live updates are enabled - orders will update automatically';
        
        ordersContainer.insertBefore(alertMessage, ordersContainer.firstChild);
        
        setTimeout(() => {
            if (alertMessage.parentNode === ordersContainer) {
                ordersContainer.removeChild(alertMessage);
            }
        }, 5000);
    } else {
        fetchOrders();
    }
});

// Tab switching
tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        // Remove active class from all buttons
        tabButtons.forEach(btn => btn.classList.remove('active'));

        // Add active class to clicked button
        button.classList.add('active');

        // Update current tab
        currentTab = button.dataset.tab;

        const addOrderSection = document.getElementById('addOrderSection');
        const searchFilterSection = document.querySelector('.search-filter-section');
        const refreshBanner = document.querySelector('.refresh-banner');

        if (currentTab === 'add-order') {
            // Show add-order form, hide order list UI
            ordersContainer.style.display = 'none';
            if (searchFilterSection) searchFilterSection.style.display = 'none';
            if (refreshBanner) refreshBanner.style.display = 'none';
            if (addOrderSection) addOrderSection.style.display = 'block';
        } else {
            // Show order list UI, hide add-order form
            ordersContainer.style.display = '';
            if (searchFilterSection) searchFilterSection.style.display = '';
            if (refreshBanner) refreshBanner.style.display = '';
            if (addOrderSection) addOrderSection.style.display = 'none';
            const filteredOrders = filterOrdersByStatus(currentTab);
            displayOrders(filteredOrders);
        }
    });
});

// Initialize app
window.addEventListener('DOMContentLoaded', () => {
    if (realtimeToggle.checked) {
        setupRealTimeListener();
    } else {
        fetchOrders();
    }
    
    // Start timer updates every 30 seconds
    setInterval(updateOrderTimers, 30000);
    
    // Initialize search and filter functionality
    initializeSearchAndFilters();
});

// Initialize search and filter event listeners
function initializeSearchAndFilters() {
    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearch');
    const quickFilterBtns = document.querySelectorAll('.quick-filter-btn');
    
    // Search input handling
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            searchQuery = e.target.value;
            
            // Show/hide clear button
            if (searchQuery.trim()) {
                clearSearchBtn.style.display = 'block';
            } else {
                clearSearchBtn.style.display = 'none';
            }
            
            // Update display
            const filteredOrders = filterOrdersByStatus(currentTab);
            displayOrders(filteredOrders);
        }, 300); // Debounce search by 300ms
    });
    
    // Clear search button
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        
        // Update display
        const filteredOrders = filterOrdersByStatus(currentTab);
        displayOrders(filteredOrders);
    });
    
    // Quick filter buttons
    quickFilterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all buttons
            quickFilterBtns.forEach(b => b.classList.remove('active'));
            
            // Add active class to clicked button
            btn.classList.add('active');
            
            // Update filter
            quickFilter = btn.dataset.filter;

            // Update display
            const filteredOrders = filterOrdersByStatus(currentTab);
            displayOrders(filteredOrders);
        });
    });
}

// ─────────────────────────────────────────────
// ADD ORDER FORM
// ─────────────────────────────────────────────

const AO_PIZZA_MENU = [
    { name: "JANE'S DOUGH",      price: 89  },
    { name: 'BRAAIBROODJIE PIZZA', price: 100 },
    { name: 'OWEN',              price: 99  },
    { name: 'MARGIE',            price: 119 },
    { name: 'CAPRESE',           price: 129 },
    { name: 'SPUD',              price: 129 },
    { name: 'CHICK TICK BOOM',   price: 149 },
    { name: 'GLAZE OF GLORY',    price: 149 },
    { name: 'PIG IN PARADISE',   price: 149 },
    { name: 'ARTICHOKE & HAM',   price: 155 },
    { name: 'QUATTRO FORMAGGI',  price: 155 },
    { name: 'MEDITERRANEAN',     price: 159 },
    { name: 'MUSHROOM CLOUD',    price: 159 },
    { name: "POPPA'S",           price: 159 },
    { name: 'THE CHAMP',         price: 159 },
    { name: 'VEGAN HARVEST',     price: 165 },
    { name: 'MISH-MASH',         price: 169 },
    { name: "LEKKER'IZZA",       price: 185 }
];

const AO_DRINKS_MENU = [
    { name: 'Coke 330ml',          price: 20 },
    { name: 'Coke Zero 330ml',     price: 20 },
    { name: 'Sprite 330ml',        price: 20 },
    { name: 'Sprite Zero 330ml',   price: 20 },
    { name: 'Ice Tea Peach 500ml', price: 20 },
    { name: 'Ice Tea Lemon 500ml', price: 20 },
    { name: 'Sparkling Water 500ml', price: 20 },
    { name: 'Still Water 500ml',   price: 20 },
    { name: 'Grapetiser 330ml',    price: 35 },
    { name: 'Appletiser 330ml',    price: 35 },
    { name: 'Savanna Zero 330ml',  price: 35 },
    { name: 'Heineken Zero 330ml', price: 35 }
];

let aoPizzaRows = [];
let aoDrinkRows = [];

function pizzaOptionsHTML(selectedName) {
    return AO_PIZZA_MENU.map(p =>
        `<option value="${p.name}" ${p.name === selectedName ? 'selected' : ''}>
            ${p.name} (R${p.price.toFixed(2)})
        </option>`
    ).join('');
}

function drinkOptionsHTML(selectedName) {
    return AO_DRINKS_MENU.map(d =>
        `<option value="${d.name}" ${d.name === selectedName ? 'selected' : ''}>
            ${d.name} (R${d.price.toFixed(2)})
        </option>`
    ).join('');
}

function renderPizzaRows() {
    const list = document.getElementById('ao-pizzaList');
    if (!list) return;
    list.innerHTML = aoPizzaRows.map((row, i) => `
        <div class="ao-pizza-row" data-pizza-index="${i}">
            <div class="ao-row">
                <select class="ao-select" onchange="updatePizzaRow(${i}, 'type', this.value)">
                    ${pizzaOptionsHTML(row.type)}
                </select>
                <input type="number" class="ao-qty" value="${row.qty}" min="1" max="10"
                    onchange="updatePizzaRow(${i}, 'qty', parseInt(this.value)||1)">
                <button type="button" class="ao-remove-btn" onclick="removePizzaRow(${i})">✕</button>
            </div>
            <input type="text" class="ao-instructions-input"
                placeholder="Special instructions for this pizza (optional)..."
                value="${(row.instructions || '').replace(/"/g, '&quot;')}"
                oninput="updatePizzaRow(${i}, 'instructions', this.value)">
        </div>
    `).join('');
    updateTotal();
}

function renderDrinkRows() {
    const list = document.getElementById('ao-drinkList');
    if (!list) return;
    list.innerHTML = aoDrinkRows.map((row, i) => `
        <div class="ao-row" data-drink-index="${i}">
            <select class="ao-select" onchange="updateDrinkRow(${i}, 'type', this.value)">
                ${drinkOptionsHTML(row.type)}
            </select>
            <input type="number" class="ao-qty" value="${row.qty}" min="1" max="10"
                onchange="updateDrinkRow(${i}, 'qty', parseInt(this.value)||1)">
            <button type="button" class="ao-remove-btn" onclick="removeDrinkRow(${i})">✕</button>
        </div>
    `).join('');
    updateTotal();
}

function addPizzaRow() {
    aoPizzaRows.push({ type: 'MARGIE', qty: 1, instructions: '' });
    renderPizzaRows();
}

function removePizzaRow(i) {
    aoPizzaRows.splice(i, 1);
    renderPizzaRows();
}

function updatePizzaRow(i, field, value) {
    aoPizzaRows[i][field] = value;
    updateTotal();
}

function addDrinkRow() {
    aoDrinkRows.push({ type: 'Coke 330ml', qty: 1 });
    renderDrinkRows();
}

function removeDrinkRow(i) {
    aoDrinkRows.splice(i, 1);
    renderDrinkRows();
}

function updateDrinkRow(i, field, value) {
    aoDrinkRows[i][field] = value;
    updateTotal();
}

function updateTotal() {
    const pizzaTotal = aoPizzaRows.reduce((sum, row) => {
        const pizza = AO_PIZZA_MENU.find(p => p.name === row.type) || { price: 0 };
        return sum + pizza.price * row.qty;
    }, 0);
    const drinkTotal = aoDrinkRows.reduce((sum, row) => {
        const drink = AO_DRINKS_MENU.find(d => d.name === row.type) || { price: 0 };
        return sum + drink.price * row.qty;
    }, 0);
    const totalEl = document.getElementById('ao-total');
    if (totalEl) totalEl.textContent = `Total: R${(pizzaTotal + drinkTotal).toFixed(2)}`;
}

async function submitNewOrder() {
    const customerName = (document.getElementById('ao-customerName')?.value || '').trim();
    const platform = document.getElementById('ao-platform')?.value || 'Window';
    const prepTime = parseInt(document.getElementById('ao-prepTime')?.value, 10) || 15;
    const orderInstructions = (document.getElementById('ao-instructions')?.value || '').trim();
    const resultEl = document.getElementById('ao-result');
    const submitBtn = document.getElementById('ao-submitBtn');

    if (!customerName) {
        showAoResult('Please enter a customer name.', 'error');
        return;
    }
    if (aoPizzaRows.length === 0 && aoDrinkRows.length === 0) {
        showAoResult('Please add at least one pizza or drink.', 'error');
        return;
    }

    if (!db) {
        showAoResult('Firebase not connected. Please refresh and try again.', 'error');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    const processedPizzas = aoPizzaRows.map((row, index) => {
        const pizza = AO_PIZZA_MENU.find(p => p.name === row.type) || { price: 0 };
        return {
            pizzaType: row.type,
            quantity: row.qty,
            totalPrice: pizza.price * row.qty,
            isCooked: false,
            rowNumber: index + 1,
            specialInstructions: row.instructions || ''
        };
    });

    const processedDrinks = aoDrinkRows.map(row => {
        const drink = AO_DRINKS_MENU.find(d => d.name === row.type) || { price: 0 };
        return {
            drinkType: row.type,
            quantity: row.qty,
            totalPrice: drink.price * row.qty
        };
    });

    const pizzaTotal = processedPizzas.reduce((s, p) => s + p.totalPrice, 0);
    const drinkTotal = processedDrinks.reduce((s, d) => s + d.totalPrice, 0);
    const totalAmount = pizzaTotal + drinkTotal;

    const now = new Date();
    const hasPizzaInstructions = processedPizzas.some(p => p.specialInstructions && p.specialInstructions.trim());
    const order = {
        customerName,
        platform,
        status: 'pending',
        pizzas: processedPizzas,
        coldDrinks: processedDrinks,
        totalAmount,
        orderTime: now.toISOString(),
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        prepTimeMinutes: prepTime,
        dueTime: new Date(Date.now() + prepTime * 60 * 1000).toISOString(),
        cooked: Array(processedPizzas.length).fill(false),
        specialInstructions: orderInstructions,
        hasSpecialInstructions: !!orderInstructions || hasPizzaInstructions,
        source: 'IllovoDashboard',
        timestamp: Date.now()
    };

    try {
        const docRef = await db.collection('orders').add(order);
        debugLog(`New order submitted from Illovo: ${docRef.id}`);
        showAoResult(`✅ Order placed! ID: ${docRef.id.substring(0, 8)}`, 'success');
        // Reset form
        aoPizzaRows = [];
        aoDrinkRows = [];
        renderPizzaRows();
        renderDrinkRows();
        document.getElementById('ao-customerName').value = '';
        document.getElementById('ao-platform').value = 'Window';
        document.getElementById('ao-prepTime').value = '15';
        const instrEl = document.getElementById('ao-instructions');
        if (instrEl) instrEl.value = '';
    } catch (error) {
        debugLog(`Error submitting order from Illovo: ${error.message}`, 'error');
        showAoResult(`❌ Error: ${error.message}`, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Place Order';
    }
}

function showAoResult(message, type) {
    const resultEl = document.getElementById('ao-result');
    if (!resultEl) return;
    resultEl.textContent = message;
    resultEl.className = `ao-result ao-result--${type}`;
    resultEl.style.display = 'block';
    setTimeout(() => { resultEl.style.display = 'none'; }, 5000);
}
