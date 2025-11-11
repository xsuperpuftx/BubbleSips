class CartSystem {
    constructor() {
        this.init();
    }

    async init() {
        await this.updateCartDisplay();
        this.setupGlobalEvents();
    }

    async addToCart(productId, quantity = 1) {
        try {
            const response = await this.makeCartRequest('add', productId, quantity);
            
            if (response.success) {
                await this.updateCartDisplay();
                this.showNotification('Producto agregado al carrito', 'success');
                return true;
            } else {
                this.showNotification(response.message || 'Error al agregar al carrito', 'error');
                return false;
            }
        } catch (error) {
            this.showNotification('Error de conexión', 'error');
            return false;
        }
    }

    async removeFromCart(productId) {
        try {
            const response = await this.makeCartRequest('remove', productId);
            
            if (response.success) {
                await this.updateCartDisplay();
                this.showNotification('Producto removido del carrito', 'success');
                return true;
            } else {
                this.showNotification(response.message || 'Error al remover del carrito', 'error');
                return false;
            }
        } catch (error) {
            this.showNotification('Error de conexión', 'error');
            return false;
        }
    }

    async updateQuantity(productId, quantity) {
        
        try {
            const response = await this.makeCartRequest('update', productId, quantity);
            
            if (response.success) {
                await this.updateCartDisplay();
                return true;
            } else {
                this.showNotification(response.message || 'Error al actualizar cantidad', 'error');
                return false;
            }
        } catch (error) {
            this.showNotification('Error de conexión', 'error');
            return false;
        }
    }

    async getCart() {
        try {
            const response = await this.makeCartRequest('get');
            return response.success ? response : null;
        } catch (error) {
            return null;
        }
    }

    async makeCartRequest(action, productId = null, quantity = 1) {
        const formData = new FormData();
        formData.append('action', action);
        
        if (productId !== null) {
            formData.append('productId', productId);
        }
        
        if (quantity !== null) {
            formData.append('quantity', quantity);
        }

        const response = await fetch('php/update_cart.php', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    }

    async updateCartDisplay() {
        const cartData = await this.getCart();
        
        if (cartData) {
            this.updateCartCount(cartData.count);

            if (typeof window.updateCartPage === 'function') {
                window.updateCartPage(cartData);
            }
        }
    }

    updateCartCount(count) {
        const cartCounters = document.querySelectorAll('.cart-count');
        cartCounters.forEach(counter => {
            counter.textContent = count || 0;
            counter.style.display = count > 0 ? 'inline' : 'none';
        });
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `cart-notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${this.getNotificationIcon(type)}"></i>
            <span>${message}</span>
            <button class="notification-close">
                <i class="fas fa-times"></i>
            </button>
        `;

        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${this.getNotificationColor(type)};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 10px;
            font-weight: 500;
            animation: slideInRight 0.3s ease-out;
            max-width: 400px;
        `;

        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.style.cssText = `
            background: none;
            border: none;
            color: white;
            cursor: pointer;
            padding: 0;
            margin-left: 10px;
            opacity: 0.8;
        `;

        closeBtn.addEventListener('click', () => {
            notification.remove();
        });

        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutRight 0.3s ease-in';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }
        }, 4000);
        this.addNotificationStyles();
    }

    getNotificationIcon(type) {
        const icons = {
            'success': 'check-circle',
            'error': 'exclamation-circle',
            'info': 'info-circle',
            'warning': 'exclamation-triangle'
        };
        return icons[type] || 'info-circle';
    }

    getNotificationColor(type) {
        const colors = {
            'success': '#27ae60',
            'error': '#e74c3c',
            'info': '#3498db',
            'warning': '#f39c12'
        };
        return colors[type] || '#3498db';
    }

    addNotificationStyles() {
        if (!document.querySelector('#notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOutRight {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
    }

    setupGlobalEvents() {
        document.addEventListener('click', async (e) => {
            const addToCartBtn = e.target.closest('.btn-add-cart');
            
            if (addToCartBtn && !addToCartBtn.disabled) {
                e.preventDefault();
                e.stopPropagation();
                
                const productId = addToCartBtn.getAttribute('data-id');
                const quantity = 1;
                
                if (productId) {
                    const originalHTML = addToCartBtn.innerHTML;
                    addToCartBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                    addToCartBtn.disabled = true;
                    
                    await this.addToCart(parseInt(productId), quantity);
                
                    setTimeout(() => {
                        addToCartBtn.innerHTML = originalHTML;
                        addToCartBtn.disabled = false;
                    }, 1000);
                }
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.cartSystem = new CartSystem();
    
    window.addToCart = (productId, quantity = 1) => {
        return window.cartSystem.addToCart(productId, quantity);
    };
    
    window.removeFromCart = (productId) => {
        return window.cartSystem.removeFromCart(productId);
    };
    
    window.updateCartQuantity = (productId, quantity) => {
        return window.cartSystem.updateQuantity(productId, quantity);
    };
});