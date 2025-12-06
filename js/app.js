// Main application JavaScript file
class PetNationApp {
    constructor() {
        this.apiBaseUrl = 'http://localhost:5000/api';
        this.token = localStorage.getItem('token');
        this.currentUser = JSON.parse(localStorage.getItem('user') || 'null');
        this.cart = JSON.parse(localStorage.getItem('cart') || '[]');
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateNavigation();
        this.loadFeaturedPets();
        this.loadShopProducts();
        this.initCart();
    }

    /* Cart functionality (shared across pages) */
    initCart() {
        // Ensure cart modal exists (some pages like shop.html may include it already)
        this.createCartModalIfMissing();

        // Update count on init
        this.updateCartCount();

        // Global click handler for add-to-cart buttons
        document.addEventListener('click', (e) => {
            const btn = e.target.closest && e.target.closest('.add-to-cart');
            if (btn) {
                e.preventDefault();
                const product = btn.dataset.product || btn.closest('.breed-card')?.dataset.product || btn.closest('.pet-card')?.dataset.product || btn.getAttribute('data-product');
                const name = btn.dataset.name || btn.getAttribute('data-name') || btn.closest('.breed-card')?.querySelector('h3')?.textContent || 'Item';
                const price = parseInt(btn.dataset.price || btn.getAttribute('data-price') || btn.closest('.breed-card')?.dataset.price || '0');
                this.addToCart(product, name, price);
            }
        });

        // Cart icon click
        const cartIcon = document.getElementById('cart-icon');
        if (cartIcon) {
            cartIcon.addEventListener('click', (e) => {
                e.preventDefault();
                this.showCartModal();
            });
        }

        // Expose functions for legacy inline handlers (if any)
        window.updateQuantity = (index, change) => this.updateQuantity(index, change);
        window.removeFromCart = (index) => this.removeFromCart(index);
    }

    createCartModalIfMissing() {
        if (document.getElementById('cart-modal')) return;

        const modal = document.createElement('div');
        modal.id = 'cart-modal';
        modal.className = 'cart-modal';
        modal.style.display = 'none';
        modal.innerHTML = `
            <div class="cart-content">
              <div class="cart-header">
                <h2>Your Cart</h2>
                <span class="close-cart">&times;</span>
              </div>
              <div class="cart-items" id="cart-items"></div>
              <div class="cart-footer">
                <div class="cart-total"><strong>Total: ₹<span id="cart-total">0</span></strong></div>
                <button class="btn btn-primary" id="checkout-btn">Checkout</button>
              </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Close handlers
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
        modal.querySelector('.close-cart')?.addEventListener('click', () => { modal.style.display = 'none'; });
        modal.querySelector('#checkout-btn')?.addEventListener('click', () => {
            if (this.cart.length === 0) {
                alert('Your cart is empty!');
                return;
            }
            const total = this.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
            alert(`Checkout functionality coming soon! Total: ₹${total}`);
        });
    }

    addToCart(product, name, price) {
        if (!product) product = `item-${Date.now()}`;
        const existing = this.cart.find(i => i.product === product);
        if (existing) {
            existing.quantity += 1;
        } else {
            this.cart.push({ product, name, price: Number(price) || 0, quantity: 1 });
        }
        localStorage.setItem('cart', JSON.stringify(this.cart));
        this.updateCartCount();
        this.showNotification(`${name} added to cart!`, 'success');
    }

    updateCartCount() {
        const count = this.cart.reduce((total, item) => total + item.quantity, 0);
        const el = document.getElementById('cart-count');
        if (el) el.textContent = count;
    }

    showCartModal() {
        this.createCartModalIfMissing();
        const modal = document.getElementById('cart-modal');
        const cartItems = document.getElementById('cart-items');
        const cartTotal = document.getElementById('cart-total');
        cartItems.innerHTML = '';
        if (this.cart.length === 0) {
            cartItems.innerHTML = '<p>Your cart is empty</p>';
            if (cartTotal) cartTotal.textContent = '0';
        } else {
            let total = 0;
            this.cart.forEach((item, index) => {
                const itemTotal = item.price * item.quantity;
                total += itemTotal;
                const div = document.createElement('div');
                div.className = 'cart-item';
                div.innerHTML = `
                    <div class="cart-item-info">
                      <h4>${item.name}</h4>
                      <p>₹${item.price} x ${item.quantity}</p>
                    </div>
                    <div class="cart-item-controls">
                      <button class="btn btn-small" data-action="dec" data-index="${index}">-</button>
                      <span>${item.quantity}</span>
                      <button class="btn btn-small" data-action="inc" data-index="${index}">+</button>
                      <button class="btn btn-small btn-danger" data-action="remove" data-index="${index}">Remove</button>
                    </div>
                    <div class="cart-item-total">₹${itemTotal}</div>
                `;
                cartItems.appendChild(div);
            });
            if (cartTotal) cartTotal.textContent = total;

            // Attach controls
            cartItems.querySelectorAll('[data-action]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const action = btn.getAttribute('data-action');
                    const idx = Number(btn.getAttribute('data-index'));
                    if (action === 'dec') this.updateQuantity(idx, -1);
                    if (action === 'inc') this.updateQuantity(idx, 1);
                    if (action === 'remove') this.removeFromCart(idx);
                });
            });
        }
        if (modal) modal.style.display = 'block';
    }

    updateQuantity(index, change) {
        if (!this.cart[index]) return;
        this.cart[index].quantity += change;
        if (this.cart[index].quantity <= 0) this.cart.splice(index,1);
        localStorage.setItem('cart', JSON.stringify(this.cart));
        this.updateCartCount();
        this.showCartModal();
    }

    removeFromCart(index) {
        if (!this.cart[index]) return;
        this.cart.splice(index,1);
        localStorage.setItem('cart', JSON.stringify(this.cart));
        this.updateCartCount();
        this.showCartModal();
    }

    setupEventListeners() {
        // Admin login form (if exists)
        const adminLoginForm = document.querySelector('#adminLoginForm');
        if (adminLoginForm) {
            adminLoginForm.addEventListener('submit', (e) => this.handleAdminLogin(e));
        }

        // Adoption form
        const adoptionForm = document.querySelector('.support-form');
        if (adoptionForm && window.location.pathname.includes('adoption')) {
            adoptionForm.addEventListener('submit', (e) => this.handleAdoptionRequest(e));
        }

        // Support form
        const supportForm = document.querySelector('.support-form');
        if (supportForm && window.location.pathname.includes('support')) {
            supportForm.addEventListener('submit', (e) => this.handleSupportTicket(e));
        }

        // Shop buy buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-primary') && e.target.textContent.includes('Buy Now')) {
                e.preventDefault();
                this.handleShopPurchase(e.target);
            }
        });

        // Pet adoption buttons
        document.addEventListener('click', (e) => {
            if (e.target.textContent.includes('Adopt') || e.target.textContent.includes('View Details')) {
                e.preventDefault();
                this.handlePetAdoption(e.target);
            }
        });

        // Price buttons
        document.addEventListener('click', (e) => {
            if (e.target.textContent.includes('View Price')) {
                e.preventDefault();
                this.showPetPrice(e.target);
            }
        });
    }

    updateNavigation() {
        const adminLink = document.querySelector('a[href*="admin"]');
        const userInfo = document.querySelector('.user-info');
        
        // Check if admin is logged in
        const adminToken = localStorage.getItem('adminToken');
        const adminUser = JSON.parse(localStorage.getItem('adminUser') || 'null');
        
        if (adminToken && adminUser) {
            if (adminLink) {
                adminLink.innerHTML = `👤 ${adminUser.username} (Admin)`;
                adminLink.href = 'admin.html';
            }
        } else {
            if (adminLink) {
                adminLink.innerHTML = '👤 Admin Login';
                adminLink.href = 'admin.html';
            }
        }
    }

    async handleAdminLogin(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const username = formData.get('username');
        const password = formData.get('password');

        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (data.success && data.user.role === 'admin') {
                this.token = data.token;
                this.currentUser = data.user;
                
                localStorage.setItem('adminToken', this.token);
                localStorage.setItem('adminUser', JSON.stringify(this.currentUser));
                
                this.showNotification('Admin login successful!', 'success');
                
                // Redirect to admin panel
                setTimeout(() => {
                    window.location.href = 'admin.html';
                }, 1000);
            } else {
                this.showNotification('Invalid admin credentials', 'error');
            }
        } catch (error) {
            console.error('Admin login error:', error);
            this.showNotification('Network error. Please try again.', 'error');
        }
    }

    async handleAdoptionRequest(e) {
        e.preventDefault();
        
        // Allow adoption requests without login for now
        this.showNotification('Adoption requests can be submitted without login', 'info');

        const formData = new FormData(e.target);
        const adoptionData = {
            name: formData.get('name'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            preferredPet: formData.get('preferred_pet'),
            message: formData.get('message'),
            userId: this.currentUser ? this.currentUser.id : null
        };

        try {
            const response = await fetch(`${this.apiBaseUrl}/adoption/request`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify(adoptionData)
            });

            const data = await response.json();

            if (data.success) {
                this.showNotification('Adoption request submitted successfully!', 'success');
                e.target.reset();
            } else {
                this.showNotification(data.message || 'Failed to submit adoption request', 'error');
            }
        } catch (error) {
            console.error('Adoption request error:', error);
            this.showNotification('Network error. Please try again.', 'error');
        }
    }

    async handleSupportTicket(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const supportData = {
            name: formData.get('name') || this.currentUser?.fullName || '',
            email: formData.get('email') || this.currentUser?.email || '',
            phone: formData.get('phone') || this.currentUser?.phone || '',
            subject: formData.get('subject') || 'General Inquiry',
            message: formData.get('message'),
            userId: this.currentUser?.id || null
        };

        try {
            const response = await fetch(`${this.apiBaseUrl}/support/tickets`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.token && { 'Authorization': `Bearer ${this.token}` })
                },
                body: JSON.stringify(supportData)
            });

            const data = await response.json();

            if (data.success) {
                this.showNotification('Support ticket submitted successfully!', 'success');
                e.target.reset();
            } else {
                this.showNotification(data.message || 'Failed to submit support ticket', 'error');
            }
        } catch (error) {
            console.error('Support ticket error:', error);
            this.showNotification('Network error. Please try again.', 'error');
        }
    }

    async handleShopPurchase(button) {
        const productCard = button.closest('.breed-card');
        const productName = productCard.querySelector('h3').textContent;
        const productPrice = this.extractPrice(productCard);
        
        // Allow purchases without login for now
        this.showNotification('Shop purchases can be made without login', 'info');

        // For demo purposes, we'll show a simple purchase flow
        const confirmed = confirm(`Purchase ${productName} for ₹${productPrice}?`);
        
        if (confirmed) {
            this.showNotification('Purchase feature coming soon! Please contact us for orders.', 'info');
        }
    }

    async handlePetAdoption(button) {
        const petCard = button.closest('.pet-card');
        const petName = petCard.querySelector('h3').textContent;
        
        // Allow pet adoption without login for now
        this.showNotification('Pet adoption can be requested without login', 'info');

        // Redirect to adoption page with pet pre-selected
        window.location.href = `adoption.html?pet=${encodeURIComponent(petName)}`;
    }

    showPetPrice(button) {
        const petCard = button.closest('.pet-card');
        const petName = petCard.querySelector('h3').textContent;
        
        // Sample prices for demo
        const prices = {
            'Birchy': 25000,
            'Charlie': 35000,
            'Harry': 40000,
            'Goldie': 45000
        };
        
        const price = prices[petName] || 'Contact for price';
        this.showNotification(`${petName} - ₹${price}`, 'info');
    }

    async loadFeaturedPets() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/pets?available=true&featured=true`);
            const data = await response.json();
            
            if (data.success && data.data) {
                this.updatePetCards(data.data);
            }
        } catch (error) {
            console.error('Error loading featured pets:', error);
        }
    }

    async loadShopProducts() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/shop/featured`);
            const data = await response.json();
            
            if (data.success && data.data) {
                this.updateShopProducts(data.data);
            }
        } catch (error) {
            console.error('Error loading shop products:', error);
        }
    }

    updatePetCards(pets) {
        const petCards = document.querySelectorAll('.pet-card');
        
        pets.forEach((pet, index) => {
            if (petCards[index]) {
                const petCard = petCards[index];
                const nameElement = petCard.querySelector('h3');
                const detailsElement = petCard.querySelector('.pet-details');
                const imageElement = petCard.querySelector('img');
                
                if (nameElement) nameElement.textContent = pet.name;
                if (detailsElement) {
                    const ageText = pet.age_weeks < 52 ? `${pet.age_weeks} weeks` : `${pet.age_weeks} weeks (${(pet.age_weeks/52).toFixed(1)} years)`;
                    const statusText = pet.is_available ? 'Available' : 'Unavailable';
                    const statusClass = pet.is_available ? 'available' : 'unavailable';
                    
                    detailsElement.innerHTML = `
                        <span>Breed: ${pet.breed}</span>
                        <span>Gender: ${pet.gender}</span>
                        <span>Age: ${ageText}</span>
                        <span class="status-badge ${statusClass}">${statusText}</span>
                    `;
                }
                if (imageElement && pet.image_url) {
                    imageElement.src = pet.image_url;
                    imageElement.alt = `${pet.name} the ${pet.breed}`;
                }
            }
        });
    }

    updateShopProducts(products) {
        const productCards = document.querySelectorAll('.breed-card');
        
        products.forEach((product, index) => {
            if (productCards[index]) {
                const productCard = productCards[index];
                const nameElement = productCard.querySelector('h3');
                const descriptionElement = productCard.querySelector('p');
                const imageElement = productCard.querySelector('img');
                
                if (nameElement) nameElement.textContent = product.name;
                if (descriptionElement) descriptionElement.textContent = product.description;
                if (imageElement && product.image_url) {
                    imageElement.src = product.image_url;
                    imageElement.alt = product.name;
                }
            }
        });
    }

    extractPrice(card) {
        // Extract price from card or return default
        const priceText = card.textContent;
        const priceMatch = priceText.match(/₹(\d+)/);
        return priceMatch ? priceMatch[1] : 'Contact';
    }

    showUserMenu() {
        const menu = document.createElement('div');
        menu.className = 'user-menu';
        menu.innerHTML = `
            <div class="user-menu-content">
                <h4>Welcome, ${(this.currentUser && (this.currentUser.fullName || this.currentUser.username)) || 'Guest'}!</h4>
                <a href="#" onclick="app.viewProfile()">View Profile</a>
                <a href="#" onclick="app.viewOrders()">My Orders</a>
                <a href="#" onclick="app.viewAdoptions()">My Adoptions</a>
                <button onclick="app.logout()">Logout</button>
            </div>
        `;
        
        menu.style.cssText = `
            position: absolute;
            top: 60px;
            right: 20px;
            background: white;
            border: 1px solid #ccc;
            border-radius: 5px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            z-index: 1000;
            min-width: 200px;
        `;
        
        document.body.appendChild(menu);
        
        // Remove menu when clicking outside
        setTimeout(() => {
            document.addEventListener('click', function removeMenu(e) {
                if (!menu.contains(e.target)) {
                    menu.remove();
                    document.removeEventListener('click', removeMenu);
                }
            });
        }, 100);
    }

    viewProfile() {
        this.showNotification('Profile page coming soon!', 'info');
    }

    viewOrders() {
        this.showNotification('Orders page coming soon!', 'info');
    }

    viewAdoptions() {
        this.showNotification('Adoptions page coming soon!', 'info');
    }

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.token = null;
        this.currentUser = null;
        this.updateNavigation();
        this.showNotification('Logged out successfully', 'success');
        
        // Reload page to update UI
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        const colors = {
            success: '#4CAF50',
            error: '#f44336',
            warning: '#ff9800',
            info: '#2196F3'
        };
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${colors[type] || colors.info};
            color: white;
            padding: 15px 20px;
            border-radius: 5px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            z-index: 10000;
            max-width: 300px;
            word-wrap: break-word;
        `;
        
        document.body.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
        
        // Remove on click
        notification.addEventListener('click', () => {
            notification.remove();
        });
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new PetNationApp();
});

// Add CSS for notifications
const style = document.createElement('style');
style.textContent = `
    .user-menu-content {
        padding: 15px;
    }
    
    .user-menu-content h4 {
        margin: 0 0 10px 0;
        color: var(--secondary-color);
    }
    
    .user-menu-content a {
        display: block;
        padding: 8px 0;
        text-decoration: none;
        color: var(--secondary-color);
        border-bottom: 1px solid #eee;
    }
    
    .user-menu-content button {
        width: 100%;
        padding: 8px;
        margin-top: 10px;
        background: var(--primary-color);
        color: white;
        border: none;
        border-radius: 3px;
        cursor: pointer;
    }
    
    .logout-btn {
        background: var(--primary-color);
        color: white;
        border: none;
        padding: 5px 10px;
        border-radius: 3px;
        cursor: pointer;
        font-size: 0.9rem;
    }
    
    .status-badge {
        display: inline-block;
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 0.8rem;
        font-weight: bold;
        margin-top: 5px;
    }
    
    .status-badge.available {
        background: #e8f5e8;
        color: #4caf50;
    }
    
    .status-badge.unavailable {
        background: #ffebee;
        color: #f44336;
    }
`;
document.head.appendChild(style);
