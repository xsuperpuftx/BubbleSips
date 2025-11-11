let allProducts = [];
let filteredProducts = [];

document.addEventListener('DOMContentLoaded', () => {
    loadProductsFromPHP();
});

async function loadProductsFromPHP() {
    try {
        const response = await fetch('php/productos_shop.php');
        
        if (!response.ok) {
            throw new Error('Error al cargar productos');
        }
        
        const products = await response.json();
        allProducts = products;
        displayProducts(products);
        setupFilters(products);
        hideLoadingMessage();
    } catch (error) {
        showErrorMessage('Error al cargar los productos. Intentando cargar datos de ejemplo...');
        loadExampleProducts();
    }
}

function hideLoadingMessage() {
    const loadingMsg = document.querySelector('.loading-message');
    if (loadingMsg) {
        loadingMsg.style.display = 'none';
    }
}

function showErrorMessage(message) {
    const productsGrid = document.getElementById('products-grid');
    productsGrid.innerHTML = `<div class="error-message">${message}</div>`;
}

function displayProducts(products) {
    const productsGrid = document.getElementById('products-grid');
    
    if (products.length === 0) {
        productsGrid.innerHTML = '<div class="no-results">No se encontraron sodas que coincidan con los filtros.</div>';
        return;
    }
    
    productsGrid.innerHTML = products.map(product => {
        const tagsArray = product.tags ? (typeof product.tags === 'string' ? product.tags.split(',') : product.tags) : [];
        
        const badge = getProductBadge(product, tagsArray);
        const stockClass = product.stock <= 3 ? 'low' : '';
        
        return `
            <div class="product-card" data-id="${product.id}" data-tags="${tagsArray.join(' ')}">
                ${badge}
                <div class="product-image">
                    <a href="product.html?id=${product.id}">
                        <img src="${product.imagen}" alt="${product.nombre}" onerror="this.src='https://via.placeholder.com/400x400?text=Imagen+No+Disponible'">
                    </a>
                </div>
                <div class="product-info">
                    <h3 class="product-title">
                        <a href="product.html?id=${product.id}">${product.nombre}</a>
                    </h3>
                    <span class="product-price">$${parseFloat(product.precio).toLocaleString('es-MX')} MXN</span>
                    <p class="product-stock ${stockClass}">Disponibles: ${product.stock}</p>
                    <div class="product-tags">
                        ${tagsArray.map(tag => `<span class="product-tag">${tag.trim()}</span>`).join('')}
                    </div>
                    <div class="product-actions">
                        <a href="product.html?id=${product.id}" class="btn-details">Más Info</a>
                        <button class="btn-add-cart" data-id="${product.id}" ${product.stock <= 0 ? 'disabled' : ''}>
                            <i class="fas fa-shopping-bag"></i>
                            ${product.stock <= 0 ? 'Agotado' : 'Agregar'}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    setupProductButtons();
}

function getProductBadge(product, tagsArray) {
    if (tagsArray.includes('limited') && product.stock <= 5) {
        return '<div class="product-badge limited">Limitada</div>';
    }
    if (tagsArray.includes('premium')) {
        return '<div class="product-badge premium">Premium</div>';
    }
    if (product.precio > 1500) {
        return '<div class="product-badge new">Exclusiva</div>';
    }
    return '';
}

function setupFilters(products) {
    const categoryFilter = document.getElementById('category-filter');
    const sortFilter = document.getElementById('sort-filter');
    
    categoryFilter.addEventListener('change', () => {
        filterAndSortProducts(products);
    });
    
    sortFilter.addEventListener('change', () => {
        filterAndSortProducts(products);
    });
}

function filterAndSortProducts(products) {
    const category = document.getElementById('category-filter').value;
    const sort = document.getElementById('sort-filter').value;
    
    let filteredProducts = [...products];
    
    if (category !== 'all') {
        filteredProducts = filteredProducts.filter(product => {
            const tagsArray = product.tags ? (typeof product.tags === 'string' ? product.tags.split(',') : product.tags) : [];
            return tagsArray.includes(category);
        });
    }
    
    switch(sort) {
        case 'price-asc':
            filteredProducts.sort((a, b) => a.precio - b.precio);
            break;
        case 'price-desc':
            filteredProducts.sort((a, b) => b.precio - a.precio);
            break;
        case 'name-asc':
            filteredProducts.sort((a, b) => a.nombre.localeCompare(b.nombre));
            break;
        case 'stock-desc':
            filteredProducts.sort((a, b) => b.stock - a.stock);
            break;
        default:
            filteredProducts.sort((a, b) => b.id - a.id);
    }
    
    displayProducts(filteredProducts);
}

function setupProductButtons() {
    document.querySelectorAll('.btn-add-cart').forEach(button => {
        button.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const productId = parseInt(e.currentTarget.getAttribute('data-id'));
            
            if (!productId || isNaN(productId)) {
                return;
            }
            
            const button = e.currentTarget;
            const originalHTML = button.innerHTML;
            const wasDisabled = button.disabled;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            button.disabled = true;
            
            try {
                await addToCart(productId);
            } catch (error) {
                showCartNotification('Error al agregar el producto al carrito', 'error');
            } finally {
                setTimeout(() => {
                    button.innerHTML = originalHTML;
                    button.disabled = wasDisabled;
                }, 1000);
            }
        });
    });
}

function addToCart(productId) {
    const product = allProducts.find(p => p.id == productId);
    if (product) {
        console.log('Agregando al carrito:', product);
        updateCartCount();
        showCartNotification(product.nombre);
    }
}

function updateCartCount() {
    const cartCount = document.querySelector('.cart-count');
    if (cartCount) {
        const currentCount = parseInt(cartCount.textContent) || 0;
        cartCount.textContent = currentCount + 1;
    }
}

function showCartNotification(productName) {
    const notification = document.createElement('div');
    notification.className = 'cart-notification';
    notification.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>${productName} agregado al carrito</span>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #27ae60;
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        z-index: 1000;
        display: flex;
        align-items: center;
        gap: 10px;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);

window.addToCart = addToCart;
window.updateCartCount = updateCartCount;
}