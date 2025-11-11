document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = parseInt(urlParams.get('id'));

    if (!productId || isNaN(productId)) {
        showErrorMessage('Producto no encontrado. Redirigiendo a la tienda...');
        setTimeout(() => {
            window.location.href = 'shop.html';
        }, 3000);
        return;
    }
    loadProductFromDatabase(productId);
});

async function loadProductFromDatabase(productId) {
    try {
        showLoadingState();
        
        const apiUrl = `php/get_producto.php?id=${productId}`;
        const response = await fetch(apiUrl);

        if (!response.ok) {
            throw new Error(`Error del servidor: ${response.status} ${response.statusText}`);
        }

        const responseText = await response.text();
    
        if (!responseText.trim()) {
            throw new Error('El servidor devolvió una respuesta vacía');
        }
        
        let product;
        try {
            product = JSON.parse(responseText);
        } catch (parseError) {
            throw new Error('El servidor devolvió datos inválidos');
        }
        
        if (product.error) {
            throw new Error(product.error);
        }

        displayProductDetails(product);
        loadRelatedProducts(product);
        setupEventListeners(product);
        hideLoadingState();
        
    } catch (error) {
        showErrorMessage('Error al cargar el producto: ' + error.message);
        setTimeout(() => {
            window.location.href = 'shop.html';
        }, 3000);
    }
}

function showLoadingState() {
    document.getElementById('product-title').textContent = 'Cargando producto...';
    document.getElementById('product-price').textContent = 'Cargando...';
    document.getElementById('product-description-text').textContent = 'Cargando descripción...';
    document.getElementById('product-stock').textContent = 'Verificando disponibilidad...';
}

function showErrorMessage(message) {
    const heroSection = document.querySelector('.product-hero');
    heroSection.innerHTML = `
        <div class="container" style="text-align: center;">
            <h1 style="color: #e74c3c; margin-bottom: 20px;">
                <i class="fas fa-exclamation-triangle"></i> Error
            </h1>
            <p style="font-size: 18px; margin-bottom: 20px;">${message}</p>
            <div class="loading-spinner"></div>
        </div>
    `;
}

function displayProductDetails(product) {

    document.title = `${product.nombre} | SODA3D`;
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
        metaDescription.setAttribute('content', product.descripcion);
    }

    document.getElementById('product-title').textContent = product.nombre;
    document.getElementById('product-subtitle').textContent = 'Pieza única de arte 3D - SODA3D';

    const mainImage = document.getElementById('main-product-image');
    if (product.imagen) {
        mainImage.src = product.imagen;
        mainImage.alt = product.nombre;
        mainImage.onerror = function() {
            this.src = 'https://via.placeholder.com/600x600/cccccc/666666?text=Imagen+No+Disponible';
        };
    } else {
        mainImage.src = 'https://via.placeholder.com/600x600/cccccc/666666?text=Imagen+No+Disponible';
        mainImage.alt = 'Imagen no disponible';
    }

    const thumbnailsContainer = document.getElementById('thumbnails');
    if (product.imagen) {
        thumbnailsContainer.innerHTML = `
            <div class="thumbnail active" data-image="${product.imagen}">
                <img src="${product.imagen}" alt="${product.nombre}" 
                     onerror="this.src='https://via.placeholder.com/100x100/cccccc/666666?text=Imagen'">
            </div>
        `;
    } else {
        thumbnailsContainer.innerHTML = '<p>No hay imágenes disponibles</p>';
    }

    const priceElement = document.getElementById('product-price');
    if (product.precio) {
        priceElement.textContent = `$${parseFloat(product.precio).toLocaleString('es-MX')} MXN`;
        priceElement.style.color = '#27ae60';
        priceElement.style.fontWeight = 'bold';
        priceElement.style.fontSize = '24px';
    } else {
        priceElement.textContent = 'Precio no disponible';
        priceElement.style.color = '#666';
    }

    const stockElement = document.getElementById('product-stock');
    if (product.stock > 0) {
        stockElement.textContent = `🟢 Disponibles: ${product.stock} unidades`;
        stockElement.style.color = 'green';
        stockElement.style.fontWeight = '600';
    } else {
        stockElement.textContent = '🔴 AGOTADO TEMPORALMENTE';
        stockElement.style.color = '#e74c3c';
        stockElement.style.fontWeight = '600';
    }
    
    const descriptionElement = document.getElementById('product-description-text');
    if (product.descripcion && product.descripcion.trim() !== '') {
        descriptionElement.textContent = product.descripcion;
        descriptionElement.style.lineHeight = '1.6';
    } else {
        descriptionElement.textContent = 'Descripción no disponible. Este producto es una pieza única de colección SODA3D.';
        descriptionElement.style.color = '#666';
        descriptionElement.style.fontStyle = 'italic';
    }

    const tagsArray = product.tags ? (typeof product.tags === 'string' ? product.tags.split(',') : product.tags) : [];
    const tagsContainer = document.getElementById('product-tags');
    if (tagsArray.length > 0) {
        tagsContainer.innerHTML = tagsArray.map(tag => 
            `<span class="product-tag">${tag.trim()}</span>`
        ).join('');
    } else {
        tagsContainer.innerHTML = '<span class="product-tag">colección</span><span class="product-tag">exclusivo</span>';
    }

    const featuresContainer = document.getElementById('product-features');
    const features = generateFeaturesFromTags(tagsArray);
    if (features.length > 0) {
        featuresContainer.innerHTML = features.map(feature => `
            <div class="feature-item">
                <i class="fas fa-check" style="color: #27ae60;"></i>
                <span>${feature}</span>
            </div>
        `).join('');
    } else {
        featuresContainer.innerHTML = `
            <div class="feature-item">
                <i class="fas fa-check" style="color: #27ae60;"></i>
                <span>Diseño único y exclusivo</span>
            </div>
            <div class="feature-item">
                <i class="fas fa-check" style="color: #27ae60;"></i>
                <span>Materiales de alta calidad</span>
            </div>
            <div class="feature-item">
                <i class="fas fa-check" style="color: #27ae60;"></i>
                <span>Arte coleccionable 3D</span>
            </div>
        `;
    }

    const addToCartBtn = document.getElementById('add-to-cart-btn');
    if (product.stock > 0) {
        addToCartBtn.disabled = false;
        addToCartBtn.textContent = 'Agregar al carrito';
        addToCartBtn.style.background = '';
        addToCartBtn.style.cursor = 'pointer';
    } else {
        addToCartBtn.disabled = true;
        addToCartBtn.textContent = 'Producto Agotado';
        addToCartBtn.style.background = '#ccc';
        addToCartBtn.style.cursor = 'not-allowed';
    }
}

function generateFeaturesFromTags(tagsArray) {
    const featuresMap = {
        'vintage': 'Diseño vintage retro clásico',
        'retro': 'Estilo retro años 80-90',
        'neon': 'Efecto neon brillante',
        'glow': 'Brillo en la oscuridad',
        'limited': 'Edición limitada numerada',
        'premium': 'Materiales premium de alta calidad',
        'crystal': 'Acabado cristalino transparente',
        'moderno': 'Diseño moderno contemporáneo',
        'tecnologico': 'Tecnología avanzada de impresión 3D',
        'coleccionable': 'Pieza de colección exclusiva',
        'arte': 'Arte tridimensional único',
        'exclusivo': 'Edición exclusiva SODA3D'
    };
    
    const features = tagsArray
        .map(tag => {
            const cleanTag = tag.trim().toLowerCase();
            return featuresMap[cleanTag];
        })
        .filter(feature => feature);
    return features;
}

async function loadRelatedProducts(currentProduct) {
    const relatedContainer = document.getElementById('related-products');
    
    try {
        relatedContainer.innerHTML = `
            <div style="text-align: center; padding: 40px; grid-column: 1 / -1;">
                <div class="loading-spinner"></div>
                <p style="margin-top: 15px; color: #666;">Cargando productos relacionados...</p>
            </div>
        `;

        const response = await fetch('php/productos_shop.php');
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }

        const allProducts = await response.json();
        
        if (!Array.isArray(allProducts)) {
            throw new Error('Formato de datos inválido del servidor');
        }

        const currentTags = currentProduct.tags ? 
            (typeof currentProduct.tags === 'string' ? currentProduct.tags.split(',') : currentProduct.tags) : [];

        const relatedProducts = allProducts
            .filter(product => {
                if (product.id === currentProduct.id) return false;
                
                const productTags = product.tags ? 
                    (typeof product.tags === 'string' ? product.tags.split(',') : product.tags) : [];
                
                const hasCommonTags = productTags.some(tag => 
                    currentTags.includes(tag.trim())
                );
            
                const sameCategory = product.categoria === currentProduct.categoria;
                return hasCommonTags || sameCategory;
            })
            .slice(0, 4);

        if (relatedProducts.length === 0) {
            relatedContainer.innerHTML = `
                <div style="text-align: center; padding: 40px; grid-column: 1 / -1;">
                    <p style="color: #666; margin-bottom: 15px;">No hay productos relacionados disponibles</p>
                    <a href="shop.html" class="btn-details" style="display: inline-block;">Ver todas las sodas</a>
                </div>
            `;
            return;
        }

        relatedContainer.innerHTML = relatedProducts.map(product => {
            const isOutOfStock = product.stock <= 0;
            
            return `
                <div class="product-card" style="opacity: ${isOutOfStock ? '0.7' : '1'}">
                    ${isOutOfStock ? '<div class="product-badge" style="background: #e74c3c;">Agotado</div>' : ''}
                    <div class="product-image">
                        <a href="product.html?id=${product.id}">
                            <img src="${product.imagen}" alt="${product.nombre}" 
                                 onerror="this.src='https://via.placeholder.com/300x300/cccccc/666666?text=Imagen+No+Disponible'">
                        </a>
                    </div>
                    <div class="product-info">
                        <h3 class="product-title">
                            <a href="product.html?id=${product.id}">${product.nombre}</a>
                        </h3>
                        <span class="product-price">$${parseFloat(product.precio).toLocaleString('es-MX')} MXN</span>
                        <div class="product-actions">
                            <a href="product.html?id=${product.id}" class="btn-details">Detalles</a>
                            <button class="btn-add-cart" data-id="${product.id}" ${isOutOfStock ? 'disabled' : ''}>
                                ${isOutOfStock ? 'Agotado' : 'Agregar'}
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        document.querySelectorAll('#related-products .btn-add-cart').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const relatedProductId = parseInt(e.target.getAttribute('data-id'));
                addToCart(relatedProductId);
            });
        });
        
    } catch (error) {
        relatedContainer.innerHTML = `
            <div style="text-align: center; padding: 40px; grid-column: 1 / -1;">
                <p style="color: #e74c3c; margin-bottom: 15px;">Error al cargar productos relacionados</p>
                <a href="shop.html" class="btn-details" style="display: inline-block;">Volver a la tienda</a>
            </div>
        `;
    }
}

function setupEventListeners(product) {
    const quantityInput = document.getElementById('product-quantity');
    const minusBtn = document.querySelector('.quantity-btn.minus');
    const plusBtn = document.querySelector('.quantity-btn.plus');
    
    if (minusBtn && plusBtn && quantityInput) {
        minusBtn.addEventListener('click', () => {
            const currentValue = parseInt(quantityInput.value) || 1;
            quantityInput.value = Math.max(1, currentValue - 1);
        });
        
        plusBtn.addEventListener('click', () => {
            const currentValue = parseInt(quantityInput.value) || 1;
            const maxStock = product.stock || 10;
            quantityInput.value = Math.min(maxStock, currentValue + 1);
        });
    }

    const thumbnails = document.querySelectorAll('.thumbnail');
    if (thumbnails.length > 0) {
        thumbnails.forEach(thumb => {
            thumb.addEventListener('click', () => {
                const newImage = thumb.getAttribute('data-image');
                document.getElementById('main-product-image').src = newImage;
                document.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
                thumb.classList.add('active');
            });
        });
    }

    const addToCartBtn = document.getElementById('add-to-cart-btn');
    if (addToCartBtn) {
        addToCartBtn.addEventListener('click', () => {
            const quantity = parseInt(quantityInput.value) || 1;
            
            if (quantity > product.stock) {
                alert(`Solo quedan ${product.stock} unidades disponibles`);
                quantityInput.value = product.stock;
                return;
            }

            for (let i = 0; i < quantity; i++) {
                addToCart(product.id);
            }
            showAddedToCartMessage(product.nombre, quantity);
        });
    }
}

function addToCart(productId) {
    updateCartCount();
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ id: productId, quantity: 1 });
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
}

function updateCartCount() {
    const cartCount = document.querySelector('.cart-count');
    if (cartCount) {
        let cart = JSON.parse(localStorage.getItem('cart')) || [];
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCount.textContent = totalItems;
        console.log('🔢 Contador de carrito actualizado:', totalItems);
    }
}

function showAddedToCartMessage(productName, quantity = 1) {
    const notification = document.createElement('div');
    notification.className = 'cart-notification';
    notification.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>${quantity > 1 ? quantity + ' unidades de ' : ''}${productName} agregado al carrito</span>
        <button onclick="this.parentElement.remove()" style="background: none; border: none; color: white; cursor: pointer; margin-left: 10px;">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #27ae60;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 10px;
        font-weight: 500;
        animation: slideIn 0.3s ease-out;
    `;
    
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
    document.body.appendChild(notification);

    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }, 4000);
    
    if (!document.querySelector('#slideOutAnimation')) {
        const slideOutStyle = document.createElement('style');
        slideOutStyle.id = 'slideOutAnimation';
        slideOutStyle.textContent = `
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(slideOutStyle);
    }
}
updateCartCount();