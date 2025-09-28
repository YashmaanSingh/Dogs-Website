// Main application JavaScript file
class PetNationApp {
    constructor() {
        this.apiBaseUrl = 'http://localhost:5000/api';
        this.token = localStorage.getItem('token');
        this.currentUser = JSON.parse(localStorage.getItem('user') || 'null');
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateNavigation();
        this.loadFeaturedPets();
        this.loadShopProducts();
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
            userId: this.currentUser.id
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
                <h4>Welcome, ${this.currentUser.fullName || this.currentUser.username}!</h4>
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
