let products = [];
let currentEditingId = null;
let selectedTags = [];

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

async function loadProducts() { // Cargar productos desde php
    try {
        const response = await fetch('php/crud_productos.php');
        
        if (!response.ok) {
            throw new Error('Error al cargar productos');
        }
        
        products = await response.json();
        
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
                    <img src="${product.imagen}" alt="${product.nombre}" onerror="this.src='https://via.placeholder.com/100?text=Imagen'">
                </div>
            </td>
            <td>${product.nombre}</td>
            <td>$${parseFloat(product.precio).toLocaleString()} MXN</td>
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
    // Botones de editar
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const productId = parseInt(e.currentTarget.dataset.id);
            openProductModal(productId);
        });
    });
    
    // Botones de eliminar
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const productId = parseInt(e.currentTarget.dataset.id);
            openConfirmModal(productId);
        });
    });
}

function getStockLevel(stock) {
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
        return;
    }
    
    document.getElementById('product-name').value = product.nombre;
    document.getElementById('product-price').value = product.precio;
    document.getElementById('product-description').value = product.descripcion;
    document.getElementById('product-stock').value = product.stock;
    document.getElementById('product-image').value = product.imagen;
    
    selectedTags = product.tags ? (typeof product.tags === 'string' ? product.tags.split(',') : product.tags) : [];
    renderSelectedTags();
}

function resetForm() {
    productForm.reset();
    selectedTags = [];
    renderSelectedTags();
    currentEditingId = null;
}

async function handleProductSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(productForm);
    const productData = {
        nombre: formData.get('name'),
        precio: parseFloat(formData.get('price')),
        descripcion: formData.get('description'),
        stock: parseInt(formData.get('stock')),
        imagen: formData.get('image'),
        tags: selectedTags.join(','), 
        categoria: 'sodas' 
    };
    
    try {
        if (currentEditingId) {
            productData.id = currentEditingId;
            await updateProduct(currentEditingId, productData);
        } else {
            await createProduct(productData);
        }
        
        closeProductModal();
    } catch (error) {
        showNotification('Error al guardar el producto', 'error');
    }
}

// Crear nuevo producto
async function createProduct(productData) {
    try {
        const response = await fetch('php/crud_productos.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(productData)
        });

        const result = await response.json();
        
        if (result.success) {
            showNotification('Producto agregado correctamente', 'success');
            await loadProducts();
        } else {
            throw new Error(result.error || 'Error desconocido');
        }
    } catch (error) {
        showNotification('Error al agregar el producto: ' + error.message, 'error');
        throw error;
    }
}

async function updateProduct(productId, productData) {
    try {
        
        const response = await fetch('php/crud_productos.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(productData)
        });

        const result = await response.json();
        
        if (result.success) {
            showNotification('Producto actualizado correctamente', 'success');
            await loadProducts();
        } else {
            throw new Error(result.error || 'Error desconocido');
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
            showNotification('Error al eliminar el producto', 'error');
        }
    }
}

async function deleteProduct(productId) {
    try {
        
        const response = await fetch(`php/crud_productos.php?id=${productId}`, {
            method: 'DELETE'
        });

        const result = await response.json();
        
        if (result.success) {
            showNotification('Producto eliminado permanentemente de la base de datos', 'success');
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
    const activeProductCount = products.filter(p => p.activo === 1).length;
    const totalStock = products.reduce((sum, product) => sum + parseInt(product.stock), 0);
    
    const productStatElement = document.querySelector('.stat-card:nth-child(1) h3');
    if (productStatElement) {
        productStatElement.textContent = activeProductCount;
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
    if (!selectedTags.includes(tag)) {
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
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: space-between;
        min-width: 300px;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 5000);
    
    notification.querySelector('.close-notification').addEventListener('click', () => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    });
}