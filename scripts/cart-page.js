window.updateCartPage = function(cartData) {

    const cartItemsList = document.getElementById('cart-items-list');
    const subtotalElement = document.getElementById('subtotal');
    const shippingElement = document.getElementById('shipping');
    const totalElement = document.getElementById('total');
    const checkoutBtn = document.getElementById('checkout-btn');
    
    if (!cartItemsList) {
        return;
    }
    
    if (!cartData || !cartData.cart || Object.keys(cartData.cart).length === 0) {
        console.log('🛒 Carrito vacío, mostrando estado vacío');
        cartItemsList.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-bag"></i>
                <p>Tu carrito está vacío</p>
                <a href="shop.html" class="btn-primary">Explorar Sodas</a>
            </div>
        `;
        
        if (subtotalElement) subtotalElement.textContent = '$0 MXN';
        if (shippingElement) shippingElement.textContent = '$0 MXN';
        if (totalElement) totalElement.textContent = '$0 MXN';
        if (checkoutBtn) checkoutBtn.disabled = true;
        
        return;
    }
    
    const subtotal = cartData.total || 0;
    const shipping = subtotal >= 1500 ? 0 : 100;
    const total = subtotal + shipping;
    
    if (subtotalElement) subtotalElement.textContent = `$${subtotal.toLocaleString('es-MX')} MXN`;
    if (shippingElement) shippingElement.textContent = shipping === 0 ? 'GRATIS' : `$${shipping.toLocaleString('es-MX')} MXN`;
    if (totalElement) totalElement.textContent = `$${total.toLocaleString('es-MX')} MXN`;
    if (checkoutBtn) checkoutBtn.disabled = false;
    
    cartItemsList.innerHTML = Object.values(cartData.cart).map(item => {
    
        const itemId = item.id || 0;
        const itemNombre = item.nombre || 'Producto sin nombre';
        const itemPrecio = parseFloat(item.precio || 0);
        const itemCantidad = parseInt(item.quantity || 1);
        const itemImagen = item.imagen || 'https://via.placeholder.com/120x120?text=Imagen';
        const itemTotal = itemPrecio * itemCantidad;
        
        return `
            <div class="cart-item" data-id="${itemId}">
                <div class="cart-item-image">
                    <img src="${itemImagen}" 
                         alt="${itemNombre}"
                         onerror="this.src='https://via.placeholder.com/120x120/cccccc/666666?text=Imagen'">
                </div>
                <div class="cart-item-details">
                    <h3 class="cart-item-title">${itemNombre}</h3>
                    <span class="cart-item-price">$${itemPrecio.toLocaleString('es-MX')} MXN</span>
                    <div class="cart-item-actions">
                        <div class="quantity-selector">
                            <button class="quantity-btn minus" onclick="decreaseQuantity(${itemId})">-</button>
                            <input type="number" class="quantity-input" value="${itemCantidad}" min="1" 
                                   onchange="updateItemQuantity(${itemId}, this.value)">
                            <button class="quantity-btn plus" onclick="increaseQuantity(${itemId})">+</button>
                        </div>
                        <button class="remove-item" onclick="removeItem(${itemId})">
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                    </div>
                </div>
                <div class="cart-item-total">
                    $${itemTotal.toLocaleString('es-MX')} MXN
                </div>
            </div>
        `;
    }).join('');
    
}

async function increaseQuantity(productId) {
    const cartData = await window.cartSystem.getCart();
    const currentItem = cartData.cart[productId];
    const currentQuantity = currentItem ? currentItem.quantity : 0;
    
    if (currentQuantity > 0) {
        await window.cartSystem.updateQuantity(productId, currentQuantity + 1);
    }
}

async function decreaseQuantity(productId) {
    const cartData = await window.cartSystem.getCart();
    const currentItem = cartData.cart[productId];
    const currentQuantity = currentItem ? currentItem.quantity : 0;
    
    if (currentQuantity > 1) {
        await window.cartSystem.updateQuantity(productId, currentQuantity - 1);
    } else {
        await window.cartSystem.removeFromCart(productId);
    }
}

async function updateItemQuantity(productId, newQuantity) {
    const quantity = parseInt(newQuantity);
    if (quantity > 0) {
        await window.cartSystem.updateQuantity(productId, quantity);
    } else if (quantity === 0) {
        await window.cartSystem.removeFromCart(productId);
    }
}

async function removeItem(productId) {
    await window.cartSystem.removeFromCart(productId);
}

document.addEventListener('DOMContentLoaded', async () => {
    
    const checkoutBtn = document.getElementById('checkout-btn');
    const backToCartBtn = document.getElementById('back-to-cart');
    const checkoutForm = document.getElementById('checkout-form');
    const confirmationMessage = document.getElementById('confirmation-message');
    const shippingForm = document.getElementById('shipping-form');
    
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
            document.querySelector('.cart-grid').style.display = 'none';
            if (checkoutForm) checkoutForm.style.display = 'block';
        });
    }
    
    if (backToCartBtn) {
        backToCartBtn.addEventListener('click', () => {
            if (checkoutForm) checkoutForm.style.display = 'none';
            document.querySelector('.cart-grid').style.display = 'grid';
        });
    }
    
    if (shippingForm) {
        shippingForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = shippingForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
            submitBtn.disabled = true;
            
            try {
                const response = await fetch('php/process_order.php', {
                    method: 'POST'
                });
                
                if (!response.ok) {
                    throw new Error(`Error HTTP: ${response.status}`);
                }
                
                const result = await response.json();
                
                if (result.success) {
                    if (checkoutForm) checkoutForm.style.display = 'none';
                    if (confirmationMessage) confirmationMessage.style.display = 'block';
                    
                    const confirmationDetails = document.getElementById('confirmation-details');
                    if (confirmationDetails) {
                        confirmationDetails.textContent = 
                            `Tu orden por $${result.order.total.toLocaleString('es-MX')} MXN ha sido procesada exitosamente. `;
                    }
                        
                    window.cartSystem.showNotification('¡Compra realizada con éxito!', 'success');
                } else {
                    throw new Error(result.message || 'Error desconocido al procesar la orden');
                }
            } catch (error) {
                window.cartSystem.showNotification('Error al procesar la orden: ' + error.message, 'error');
                
                if (checkoutForm) checkoutForm.style.display = 'block';
                document.querySelector('.cart-grid').style.display = 'none';
            } finally {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    }
    
    try {
        const cartData = await window.cartSystem.getCart();
        
        if (cartData && cartData.success !== false) {
            window.updateCartPage(cartData);
        } else {
            window.updateCartPage(null);
        }
    } catch (error) {
        window.updateCartPage(null);
    }
});