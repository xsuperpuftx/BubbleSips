function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const count = cart.reduce((total, item) => total + item.quantity, 0);
    
    document.querySelectorAll('.cart-count').forEach(element => {
        element.textContent = count;
    });
}

document.addEventListener('DOMContentLoaded', updateCartCount);

window.addEventListener('storage', (event) => {
    if (event.key === 'cart') {
        updateCartCount();
    }
});