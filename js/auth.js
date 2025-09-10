const apiUrl = import.meta.env.VITE_API_URL;
class AuthManager {
    constructor() {
        this.token = localStorage.getItem('token');
        this.userId = localStorage.getItem('userId');
        this.userData = JSON.parse(localStorage.getItem('userData') || '{}');
    }
    
    isAuthenticated() {
        return !!this.token;
    }
    
    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        localStorage.removeItem('userData');
        this.token = null;
        this.userId = null;
        this.userData = {};
        
        window.location.href = 'index.html';
    }
    
    getAuthHeader() {
        return {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
        };
    }
    
    async updateUserStatus(online) {
        if (!this.isAuthenticated()) return;
        
        try {
            await fetch(`${apiUrl}/api/users/status`, {
                method: 'PATCH',
                headers: this.getAuthHeader(),
                body: JSON.stringify({ online })
            });
        } catch (error) {
            console.error('Error updating user status:', error);
        }
    }
    
    async updateUserProfile(updates) {
        if (!this.isAuthenticated()) return;
        
        try {
            const response = await fetch(`${apiUrl}/api/users/profile`, {
                method: 'PATCH',
                headers: this.getAuthHeader(),
                body: JSON.stringify(updates)
            });
            
            if (response.ok) {
                const data = await response.json();
                this.userData = data.data.user;
                localStorage.setItem('userData', JSON.stringify(this.userData));
                return data.data.user;
            }
        } catch (error) {
            console.error('Error updating user profile:', error);
            throw error;
        }
    }
}

// Initialize auth manager
const authManager = new AuthManager();

// Check authentication on pages that require it
document.addEventListener('DOMContentLoaded', function() {
    const protectedPages = ['chat.html'];
    const currentPage = window.location.pathname.split('/').pop();
    
    if (protectedPages.includes(currentPage) && !authManager.isAuthenticated()) {
        window.location.href = 'login.html';
    }
    
    // Update user status to online when page loads
    if (authManager.isAuthenticated()) {
        authManager.updateUserStatus(true);
        
        // Update user status to offline when page is closed or refreshed
        window.addEventListener('beforeunload', function() {
            authManager.updateUserStatus(false);
        });
    }
});