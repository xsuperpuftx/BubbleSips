let products = [];
let currentEditingId = null;
let selectedTags = [];
let currentImageFile = null;

const productsTableBody = document.querySelector('.products-table tbody');
const addProductBtn = document.getElementById('add-product-btn');
const productModal = document.getElementById('product-modal');
const confirmModal = document.getElementById('confirm-modal');
const productForm = document.getElementById('product-form');
const cancelBtn = document.getElementById('cancel-btn');
const closeModal = document.querySelector('.close-modal');
const cancelDelete = document.getElementById('cancel-delete');
const confirmDelete = document.getElementById('confirm-delete');
const selectedTagsContainer = document.getElementById('selected-tags');
const tagInput = document.getElementById('tag-input');
const suggestedTags = document.querySelectorAll('.tag-suggestion');

document.addEventListener('DOMContentLoaded', function() {
    loadProducts();
    setupEventListeners();
});

async function loadProducts() {
    try {
        const response = await fetch('php/crud_productos.php');
        
        if (!response.ok) {
            throw new Error('Error al cargar productos: ' + response.status);
        }
        
        const data = await response.json();
        
        if (Array.isArray(data)) {
            products = data;
        } else if (data.error) {
            throw new Error(data.error);
        } else {
            throw new Error('Formato de respuesta inválido');
        }
        
        renderProducts();
        updateStats();
    } catch (error) {
        console.error('Error loading products:', error);
        showNotification('Error al cargar los productos: ' + error.message, 'error');
    }
}

function setupEventListeners() {
    addProductBtn.addEventListener('click', () => openProductModal());
    closeModal.addEventListener('click', () => closeProductModal());
    cancelBtn.addEventListener('click', () => closeProductModal());
    
    productForm.addEventListener('submit', handleProductSubmit);
    
    cancelDelete.addEventListener('click', () => closeConfirmModal());
    confirmDelete.addEventListener('click', handleDeleteConfirm);
    
    tagInput.addEventListener('keydown', handleTagInput);
    suggestedTags.forEach(tag => {
        tag.addEventListener('click', () => addTag(tag.dataset.tag));
    });
    
    // Event listener para el input de imagen
    const imageInput = document.getElementById('product-image');
    if (imageInput) {
        imageInput.addEventListener('change', handleImageSelect);
    }
    
    window.addEventListener('click', (e) => {
        if (e.target === productModal) closeProductModal();
        if (e.target === confirmModal) closeConfirmModal();
    });
}

function renderProducts() {
    productsTableBody.innerHTML = '';
    
    if (!Array.isArray(products)) {
        productsTableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px; color: red;">Error: Los datos no son válidos</td></tr>';
        return;
    }
    
    if (products.length === 0) {
        productsTableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px;">No hay productos disponibles</td></tr>';
        return;
    }
    
    products.forEach(product => {
        const tagsArray = product.tags ? (typeof product.tags === 'string' ? product.tags.split(',') : product.tags) : [];
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${product.id}</td>
            <td>
                <div class="product-image-small">
                    <img src="${product.imagen || 'https://via.placeholder.com/100?text=Imagen'}" alt="${product.nombre}" onerror="this.src='https://via.placeholder.com/100?text=Imagen'">
                </div>
            </td>
            <td>${product.nombre}</td>
            <td>$${parseFloat(product.precio || 0).toLocaleString('es-MX')} MXN</td>
            <td>
                <span class="stock-badge ${getStockLevel(product.stock)}">${product.stock}</span>
            </td>
            <td>
                <div class="tags-container">
                    ${tagsArray.map(tag => `<span class="tag">${tag.trim()}</span>`).join('')}
                </div>
            </td>
            <td>
                <span class="status-badge ${product.activo ? 'active' : 'inactive'}">${product.activo ? 'Activo' : 'Inactivo'}</span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn-edit" data-id="${product.id}" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-delete" data-id="${product.id}" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        productsTableBody.appendChild(row);
    });
    
    setupTableEvents();
}

function setupTableEvents() {
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const productId = parseInt(e.currentTarget.dataset.id);
            openProductModal(productId);
        });
    });
    
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const productId = parseInt(e.currentTarget.dataset.id);
            openConfirmModal(productId);
        });
    });
}

function getStockLevel(stock) {
    stock = parseInt(stock) || 0;
    if (stock > 10) return 'high';
    if (stock > 3) return 'medium';
    return 'low';
}

function openProductModal(productId = null) {
    const modalTitle = document.getElementById('modal-title');
    
    if (productId) {
        currentEditingId = productId;
        modalTitle.textContent = 'Editar Producto';
        fillFormWithProductData(productId);
    } else {
        currentEditingId = null;
        modalTitle.textContent = 'Agregar Producto';
        resetForm();
    }
    
    productModal.style.display = 'block';
}

function closeProductModal() {
    productModal.style.display = 'none';
    resetForm();
}

function fillFormWithProductData(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) {
        showNotification('Producto no encontrado', 'error');
        return;
    }
    
    document.getElementById('product-name').value = product.nombre || '';
    document.getElementById('product-price').value = product.precio || '';
    document.getElementById('product-description').value = product.descripcion || '';
    document.getElementById('product-stock').value = product.stock || '';
    
    // Mostrar preview de imagen existente
    const imagePreview = document.getElementById('image-preview');
    if (product.imagen) {
        imagePreview.innerHTML = `
            <img src="${product.imagen}" alt="Preview" style="max-width: 200px; max-height: 200px; border-radius: 5px;">
            <p style="margin-top: 5px; font-size: 12px; color: #666;">Imagen actual</p>
        `;
    } else {
        imagePreview.innerHTML = '<p style="color: #999;">No hay imagen</p>';
    }
    
    selectedTags = product.tags ? (typeof product.tags === 'string' ? product.tags.split(',').map(tag => tag.trim()) : product.tags) : [];
    renderSelectedTags();
    currentImageFile = null;
}

function resetForm() {
    productForm.reset();
    selectedTags = [];
    renderSelectedTags();
    currentEditingId = null;
    currentImageFile = null;
    
    // Limpiar preview de imagen
    const imagePreview = document.getElementById('image-preview');
    imagePreview.innerHTML = '';
}

async function handleProductSubmit(e) {
    e.preventDefault();
    
    // Validar imagen
    const imageInput = document.getElementById('product-image');
    let imagenUrl = '';
    
    // Si hay un archivo seleccionado, procesarlo
    if (currentImageFile) {
        try {
            imagenUrl = await uploadImage(currentImageFile);
        } catch (error) {
            showNotification('Error al subir la imagen: ' + error.message, 'error');
            return;
        }
    } else if (currentEditingId) {
        // Si estamos editando y no se cambió la imagen, mantener la existente
        const existingProduct = products.find(p => p.id === currentEditingId);
        imagenUrl = existingProduct?.imagen || '';
    }
    
    // Obtener valores directamente de los inputs
    const productData = {
        nombre: document.getElementById('product-name').value.trim(),
        precio: parseFloat(document.getElementById('product-price').value) || 0,
        descripcion: document.getElementById('product-description').value.trim(),
        stock: parseInt(document.getElementById('product-stock').value) || 0,
        imagen: imagenUrl,
        tags: selectedTags.join(','),
        categoria: 'sodas'
    };
    
    // Validaciones básicas
    if (!productData.nombre) {
        showNotification('El nombre del producto es requerido', 'error');
        return;
    }
    
    if (productData.precio <= 0) {
        showNotification('El precio debe ser mayor a 0', 'error');
        return;
    }
    
    if (productData.stock < 0) {
        showNotification('El stock no puede ser negativo', 'error');
        return;
    }
    
    try {
        if (currentEditingId) {
            productData.id = currentEditingId;
            await updateProduct(productData);
        } else {
            await createProduct(productData);
        }
        
        closeProductModal();
    } catch (error) {
        console.error('Error saving product:', error);
        showNotification('Error al guardar el producto: ' + error.message, 'error');
    }
}

// Función para subir imagen
async function uploadImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            // Convertir la imagen a base64
            const base64Image = e.target.result;
            resolve(base64Image);
        };
        
        reader.onerror = function() {
            reject(new Error('Error al leer el archivo de imagen'));
        };
        
        reader.readAsDataURL(file);
    });
}

// Función para manejar la selección de imagen
function handleImageSelect(e) {
    const file = e.target.files[0];
    const imagePreview = document.getElementById('image-preview');
    
    if (file) {
        // Validar tipo de archivo
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            showNotification('Formato de imagen no válido. Use JPG, PNG, GIF o WebP.', 'error');
            e.target.value = '';
            return;
        }
        
        // ELIMINAR VALIDACIÓN DE TAMAÑO - Permitir cualquier tamaño
        currentImageFile = file;
        
        // Mostrar preview
        const reader = new FileReader();
        reader.onload = function(e) {
            imagePreview.innerHTML = `
                <img src="${e.target.result}" alt="Preview" style="max-width: 200px; max-height: 200px; border-radius: 5px;">
                <p style="margin-top: 5px; font-size: 12px; color: #666;">Nueva imagen seleccionada</p>
            `;
        };
        reader.readAsDataURL(file);
    } else {
        currentImageFile = null;
        imagePreview.innerHTML = '';
    }
}

async function createProduct(productData) {
    try {
        const response = await fetch('php/crud_productos.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(productData)
        });

        if (!response.ok) {
            throw new Error('Error HTTP: ' + response.status);
        }

        const result = await response.json();
        
        if (result.success) {
            showNotification('Producto agregado correctamente', 'success');
            await loadProducts();
        } else {
            throw new Error(result.error || 'Error desconocido al crear producto');
        }
    } catch (error) {
        showNotification('Error al agregar el producto: ' + error.message, 'error');
        throw error;
    }
}

async function updateProduct(productData) {
    try {
        const response = await fetch('php/crud_productos.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(productData)
        });

        if (!response.ok) {
            throw new Error('Error HTTP: ' + response.status);
        }

        const result = await response.json();
        
        if (result.success) {
            showNotification('Producto actualizado correctamente', 'success');
            await loadProducts();
        } else {
            throw new Error(result.error || 'Error desconocido al actualizar producto');
        }
    } catch (error) {
        showNotification('Error al actualizar el producto: ' + error.message, 'error');
        throw error;
    }
}

function openConfirmModal(productId) {
    currentEditingId = productId;
    confirmModal.style.display = 'block';
}

function closeConfirmModal() {
    confirmModal.style.display = 'none';
    currentEditingId = null;
}

async function handleDeleteConfirm() {
    if (currentEditingId) {
        try {
            await deleteProduct(currentEditingId);
            closeConfirmModal();
        } catch (error) {
            console.error('Error deleting product:', error);
            showNotification('Error al eliminar el producto: ' + error.message, 'error');
        }
    }
}

async function deleteProduct(productId) {
    try {
        const response = await fetch(`php/crud_productos.php?id=${productId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Error HTTP: ' + response.status);
        }

        const result = await response.json();
        
        if (result.success) {
            showNotification('Producto eliminado correctamente', 'success');
            await loadProducts();
        } else {
            throw new Error(result.error || 'Error al eliminar el producto');
        }
    } catch (error) {
        showNotification('Error al eliminar el producto: ' + error.message, 'error');
        throw error;
    }
}

function updateStats() {
    const activeProductCount = products.filter(p => p.activo === 1 || p.activo === true).length;
    const totalStock = products.reduce((sum, product) => sum + (parseInt(product.stock) || 0), 0);
    
    const productStatElement = document.querySelector('.stat-card:nth-child(1) h3');
    if (productStatElement) {
        productStatElement.textContent = activeProductCount;
    }
    
    const stockStatElement = document.querySelector('.stat-card:nth-child(2) h3');
    if (stockStatElement) {
        stockStatElement.textContent = totalStock;
    }
}

function handleTagInput(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        const tag = tagInput.value.trim().toLowerCase();
        if (tag && !selectedTags.includes(tag)) {
            addTag(tag);
        }
        tagInput.value = '';
    }
}

function addTag(tag) {
    tag = tag.trim().toLowerCase();
    if (tag && !selectedTags.includes(tag)) {
        selectedTags.push(tag);
        renderSelectedTags();
    }
}

function removeTag(tag) {
    selectedTags = selectedTags.filter(t => t !== tag);
    renderSelectedTags();
}

function renderSelectedTags() {
    selectedTagsContainer.innerHTML = '';
    selectedTags.forEach(tag => {
        const tagElement = document.createElement('span');
        tagElement.className = 'tag selected-tag';
        tagElement.innerHTML = `
            ${tag}
            <span class="remove-tag" data-tag="${tag}">&times;</span>
        `;
        selectedTagsContainer.appendChild(tagElement);
    });
    
    document.querySelectorAll('.remove-tag').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tagToRemove = e.target.dataset.tag;
            removeTag(tagToRemove);
        });
    });
}

function showNotification(message, type = 'info') {
    // Eliminar notificaciones existentes
    document.querySelectorAll('.notification').forEach(notification => {
        notification.remove();
    });
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button class="close-notification">&times;</button>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : '#3498db'};
        color: white;
        border-radius: 5px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: space-between;
        min-width: 300px;
        max-width: 400px;
        animation: slideIn 0.3s ease-out;
    `;
    
    // Agregar estilos de animación si no existen
    if (!document.querySelector('#notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // Auto-remover después de 5 segundos
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }, 5000);
    
    notification.querySelector('.close-notification').addEventListener('click', () => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    });
}