// FoodShare Frontend JavaScript
const API_BASE = 'http://localhost:5000/api';

// DOM Elements
const loginModal = document.getElementById('loginModal');
const registrationModal = document.getElementById('registrationModal');
const donateModal = document.getElementById('donateModal');
const profileModal = document.getElementById('profileModal');
const loginBtn = document.getElementById('loginBtn');
const registerNavBtn = document.getElementById('registerNavBtn');
const profileBtn = document.getElementById('profileBtn');
const logoutBtn = document.getElementById('logoutBtn');
const heroDonateBtn = document.getElementById('heroDonateBtn');
const closeButtons = document.querySelectorAll('.close');
const loginForm = document.getElementById('loginForm');
const registrationForm = document.getElementById('registrationForm');
const donateForm = document.getElementById('donateForm');
const foodContainer = document.getElementById('foodContainer');
const userWelcome = document.getElementById('userWelcome');
const profileContent = document.getElementById('profileContent');
const switchToRegister = document.getElementById('switchToRegister');
const switchToLogin = document.getElementById('switchToLogin');

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    setupEventListeners();
    setupNavigation();
    loadCommunityNeeds();
    checkExistingUser();
    updateStats();
    setActiveNav('home');
}

function setupEventListeners() {
    loginBtn.addEventListener('click', () => openModal(loginModal));
    registerNavBtn.addEventListener('click', () => openModal(registrationModal));
    profileBtn.addEventListener('click', () => openProfileModal());
    logoutBtn.addEventListener('click', handleLogout);
    heroDonateBtn.addEventListener('click', () => {
        const user = getCurrentUser();
        if (!user) {
            alert('Please register first to donate food.');
            openModal(registrationModal);
        } else {
            openModal(donateModal);
        }
    });

    switchToRegister.addEventListener('click', (e) => {
        e.preventDefault();
        closeModals();
        openModal(registrationModal);
    });
    
    switchToLogin.addEventListener('click', (e) => {
        e.preventDefault();
        closeModals();
        openModal(loginModal);
    });

    closeButtons.forEach(button => {
        button.addEventListener('click', closeModals);
    });

    loginForm.addEventListener('submit', handleLogin);
    registrationForm.addEventListener('submit', handleRegistration);
    donateForm.addEventListener('submit', handleFoodDonation);
    
    document.getElementById('urgencyFilter')?.addEventListener('change', loadCommunityNeeds);
}

function openModal(modal) {
    if (modal) modal.style.display = 'block';
}

function openProfileModal() {
    loadProfileData();
    if (profileModal) profileModal.style.display = 'block';
}

function closeModals() {
    if (loginModal) loginModal.style.display = 'none';
    if (registrationModal) registrationModal.style.display = 'none';
    if (donateModal) donateModal.style.display = 'none';
    if (profileModal) profileModal.style.display = 'none';
}

async function apiCall(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            headers: { 'Content-Type': 'application/json' },
            ...options
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('API Error:', error);
        return { success: false, error: 'Connection failed' };
    }
}

async function handleLogin(event) {
    event.preventDefault();
    const formData = new FormData(loginForm);
    const loginData = {
        username: formData.get('loginUsername'),
        password: formData.get('loginPassword')
    };
    
    document.getElementById('loginError').style.display = 'none';
    
    const result = await apiCall('/login', {
        method: 'POST',
        body: JSON.stringify(loginData)
    });
    
    if (result.success) {
        localStorage.setItem('currentUser', JSON.stringify(result.user));
        updateUserInterface(result.user);
        closeModals();
        loginForm.reset();
        alert(`Welcome back, ${result.user.name || result.user.username || 'User'}!`);
    } else {
        document.getElementById('loginError').textContent = result.error || 'Invalid username or password!';
        document.getElementById('loginError').style.display = 'block';
    }
}

async function handleRegistration(event) {
    event.preventDefault();
    
    const formData = new FormData(registrationForm);
    const userData = {
        name: formData.get('userName'),
        username: formData.get('userUsername'),
        email: formData.get('userEmail'),
        password: formData.get('userPassword'),
        userType: formData.get('userType'),
        location: formData.get('userLocation'),
        phone: formData.get('userPhone')
    };
    
    if (userData.password.length < 6) {
        alert('Password must be at least 6 characters!');
        return;
    }
    
    document.getElementById('registerError').style.display = 'none';
    
    const result = await apiCall('/register', {
        method: 'POST',
        body: JSON.stringify(userData)
    });
    
    if (result.success) {
        localStorage.setItem('currentUser', JSON.stringify(result.user));
        updateUserInterface(result.user);
        closeModals();
        registrationForm.reset();
        alert(`Welcome to FoodShare, ${userData.name || userData.username || 'User'}!`);
        updateStats();
    } else {
        document.getElementById('registerError').textContent = result.error || 'Registration failed. Please try again.';
        document.getElementById('registerError').style.display = 'block';
    }
}

function getPickupTime() {
    try {
        const startHour = document.getElementById('startHour').value;
        const startMinute = document.getElementById('startMinute').value;
        const startAmPm = document.getElementById('startAmPm').value;
        const endHour = document.getElementById('endHour').value;
        const endMinute = document.getElementById('endMinute').value;
        const endAmPm = document.getElementById('endAmPm').value;
        
        if (!startHour || !startMinute || !startAmPm || !endHour || !endMinute || !endAmPm) {
            return '';
        }
        
        return `${startHour}:${startMinute} ${startAmPm} - ${endHour}:${endMinute} ${endAmPm}`;
    } catch (error) {
        return '';
    }
}

async function handleFoodDonation(event) {
    event.preventDefault();
    
    const user = getCurrentUser();
    if (!user) {
        alert('Please login first!');
        return;
    }
    
    const foodName = document.getElementById('foodName').value;
    const quantity = parseFloat(document.getElementById('quantity').value);
    const unit = document.getElementById('unit').value;
    const description = document.getElementById('description').value;
    const location = document.getElementById('location').value;
    const pickupTime = getPickupTime();
    
    if (!foodName) {
        alert('Please enter a food item name!');
        return;
    }
    
    if (!quantity || quantity <= 0) {
        alert('Please enter a valid quantity!');
        return;
    }
    
    if (!location) {
        alert('Please enter a pickup location!');
        return;
    }
    
    if (!pickupTime) {
        alert('Please select pickup times!');
        return;
    }
    
    const donationData = {
        foodName: foodName,
        quantity: quantity,
        unit: unit,
        description: description,
        pickupTime: pickupTime,
        location: location,
        donorName: user.name || user.username || 'User',
        donorPhone: user.phone || ''
    };
    
    const result = await apiCall('/donate-food', {
        method: 'POST',
        body: JSON.stringify(donationData)
    });
    
    if (result.success) {
        alert(`Thank you, ${user.name || user.username || 'User'}! Your donation has been submitted.`);
        donateForm.reset();
        closeModals();
        updateStats();
        loadProfileData();
    } else {
        alert('Donation submission failed. Please try again.');
    }
}

function handleLogout() {
    localStorage.removeItem('currentUser');
    updateUserInterface(null);
    alert('Logged out successfully.');
}

function getCurrentUser() {
    try {
        return JSON.parse(localStorage.getItem('currentUser'));
    } catch (e) {
        return null;
    }
}

function updateUserInterface(user) {
    if (user) {
        // FIXED: Proper username display with fallback
        const displayName = user.name || user.username || 'User';
        userWelcome.textContent = `Welcome, ${displayName}!`;
        userWelcome.style.display = 'inline';
        profileBtn.style.display = 'inline';
        logoutBtn.style.display = 'inline';
        loginBtn.style.display = 'none';
        registerNavBtn.style.display = 'none';
    } else {
        userWelcome.style.display = 'none';
        profileBtn.style.display = 'none';
        logoutBtn.style.display = 'none';
        loginBtn.style.display = 'inline';
        registerNavBtn.style.display = 'inline';
    }
}

async function loadCommunityNeeds() {
    const result = await apiCall('/community-needs');
    showEmptyState();
}

function showEmptyState() {
    if (!foodContainer) return;
    foodContainer.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">😊</div>
            <h3>No community needs right now</h3>
            <p>You can still donate food to help others in need!</p>
            <button id="emptyDonateBtn" class="btn-primary">Donate Food Now</button>
        </div>
    `;
    
    document.getElementById('emptyDonateBtn')?.addEventListener('click', () => {
        const user = getCurrentUser();
        if (!user) {
            alert('Please register first to donate food.');
            openModal(registrationModal);
        } else {
            openModal(donateModal);
        }
    });
}

async function confirmCollection(donationId) {
    const confirmed = confirm('Has the food been collected?');
    if (confirmed) {
        const result = await apiCall('/confirm-collection', {
            method: 'POST',
            body: JSON.stringify({ donationId: donationId })
        });
        
        if (result.success) {
            alert('Collection confirmed! Thank you!');
            loadProfileData();
            updateStats();
        }
    }
}

// Profile - FIXED all undefined issues
async function loadProfileData() {
    const user = getCurrentUser();
    if (!profileContent || !user) {
        if (profileContent) profileContent.innerHTML = '<p>Please login to view profile.</p>';
        return;
    }
    
    const result = await apiCall(`/user-donations/${encodeURIComponent(user.name || user.username || 'User')}`);
    const donations = result.success ? result.donations : [];
    
    const pending = donations.filter(d => !d.collected);
    const completed = donations.filter(d => d.collected);
    
    // FIXED: All user data with proper fallbacks
    const displayName = user.name || user.username || 'User';
    const userType = getUserTypeLabel(user.userType);
    const userLocation = user.location || 'Not specified';
    
    profileContent.innerHTML = `
        <div class="profile-header">
            <div class="profile-avatar">👤</div>
            <h2>${displayName}</h2>
            <p>${userType}</p>
            <p><strong>Location:</strong> ${userLocation}</p>
        </div>
        
        <div class="profile-stats">
            <div class="profile-stat">
                <span class="profile-stat-number">${donations.length}</span>
                <span class="profile-stat-label">Total Donations</span>
            </div>
            <div class="profile-stat">
                <span class="profile-stat-number">${completed.length}</span>
                <span class="profile-stat-label">Completed</span>
            </div>
            <div class="profile-stat">
                <span class="profile-stat-number">${pending.length}</span>
                <span class="profile-stat-label">Pending</span>
            </div>
        </div>
        
        <div class="donation-history">
            <h3>Your Food Donations</h3>
            ${donations.length > 0 ? donations.map(d => `
                <div class="donation-item ${d.collected ? 'completed' : 'pending'}">
                    <div class="donation-header">
                        <span class="donation-food">${d.food_name || d.foodName || 'Food Donation'}</span>
                        <span class="donation-date">${formatDate(d.created_at || d.createdAt)}</span>
                    </div>
                    <div class="donation-details">
                        <p><strong>Quantity:</strong> ${d.quantity} ${d.unit}</p>
                        <p><strong>Description:</strong> ${d.description || 'No description'}</p>
                        <p><strong>Pickup Location:</strong> ${d.location || 'Not specified'}</p>
                        <p><strong>Pickup Time:</strong> ${d.pickup_time || d.pickupTime || 'Flexible'}</p>
                        <p><strong>Status:</strong> ${d.collected ? '✅ Collected' : '🟡 Pending'}</p>
                    </div>
                    ${!d.collected ? `
                        <button class="btn-primary" onclick="confirmCollection(${d.id})">
                            ✅ Confirm Collected
                        </button>
                    ` : ''}
                </div>
            `).join('') : '<p class="no-donations">No donations yet.</p>'}
        </div>
    `;
}

async function updateStats() {
    const result = await apiCall('/stats');
    if (result.success) {
        document.getElementById('totalMeals').textContent = result.stats.mealsShared;
        document.getElementById('activeDonations').textContent = result.stats.mealsReceived;
        document.getElementById('communityMembers').textContent = result.stats.totalUsers;
    }
}

function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            const targetId = this.getAttribute('href').substring(1);
            scrollToSection(targetId);
        });
    });
}

function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        const navbarHeight = document.querySelector('.navbar').offsetHeight;
        const sectionPosition = section.offsetTop - navbarHeight;
        window.scrollTo({ top: sectionPosition, behavior: 'smooth' });
    }
}

function setActiveNav(sectionId) {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${sectionId}`) {
            link.classList.add('active');
        }
    });
}

function checkExistingUser() {
    const user = getCurrentUser();
    if (user) updateUserInterface(user);
}

function getUserTypeLabel(type) {
    const types = {
        'individual': 'Individual/Family',
        'restaurant': 'Restaurant/Cafe',
        'bakery': 'Bakery',
        'grocery': 'Grocery Store',
        'catering': 'Catering Service',
        'charity': 'Charity/Organization'
    };
    return types[type] || 'User';
}

function formatDate(dateString) {
    try {
        if (!dateString) return 'Recent';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US');
    } catch (e) {
        return 'Recent';
    }
}

window.confirmCollection = confirmCollection;