document.addEventListener('DOMContentLoaded', function() {
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    
    if (searchForm) {
        searchForm.addEventListener('submit', function(e) {
            e.preventDefault();
            performSearch(searchInput.value.trim());
        });
        
        searchInput.addEventListener('input', function() {
            const query = this.value.trim();
            if (query.length >= 2) {
                performSearch(query);
            } else {
                hideResults();
            }
        });
        
        document.addEventListener('click', function(e) {
            if (!searchForm.contains(e.target)) {
                hideResults();
            }
        });
        
        searchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                hideResults();
                this.blur();
            }
        });
    }
    
    async function performSearch(query) {
        if (!query) {
            hideResults();
            return;
        }
        
        try {
            const response = await fetch(`php/buscar.php?q=${encodeURIComponent(query)}`);
            const data = await response.json();
            
            if (data.success) {
                displayResults(data.results, query);
            } else {
                showNoResults(query);
            }
        } catch (error) {
            console.error('Error en búsqueda:', error);
            showError();
        }
    }
    
    function displayResults(products, query) {
        if (products.length === 0) {
            showNoResults(query);
            return;
        }
        
        let html = `
            <div class="search-results-header">
                <h4>${products.length} soda(s) encontrada(s)</h4>
                <a href="shop.html?search=${encodeURIComponent(query)}" class="view-all-results">Ver todas →</a>
            </div>
            <div class="search-results-list">
        `;
        
        const previewProducts = products.slice(0, 5);
        
        previewProducts.forEach(product => {
            html += `
                <div class="search-result-item" onclick="goToProduct(${product.id})">
                    <div class="result-image">
                        <img src="${product.imagen}" alt="${product.nombre}" onerror="this.src='https://via.placeholder.com/60?text=Imagen'">
                    </div>
                    <div class="result-info">
                        <h5>${product.nombre}</h5>
                        <p class="result-price">$${parseFloat(product.precio).toLocaleString('es-MX')} MXN</p>
                        <p class="result-stock">Disponibles: ${product.stock}</p>
                    </div>
                </div>
            `;
        });
        
        html += `</div>`;
        searchResults.innerHTML = html;
        showResults();
    }
    
    function showNoResults(query) {
        searchResults.innerHTML = `
            <div class="no-results">
                <p>No se encontraron sodas con el nombre "<strong>${query}</strong>"</p>
                <a href="shop.html" class="btn-view-all">Ver todas las sodas</a>
            </div>
        `;
        showResults();
    }
    
    function showError() {
        searchResults.innerHTML = `
            <div class="search-error">
                <p>Error al buscar. Intenta nuevamente.</p>
            </div>
        `;
        showResults();
    }
    
    function showResults() {
        searchResults.style.display = 'block';
    }
    
    function hideResults() {
        searchResults.style.display = 'none';
    }
});

function goToProduct(productId) {
    window.location.href = `product.html?id=${productId}`;
}