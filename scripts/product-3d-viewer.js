// product-3d-viewer.js - Visor 3D interactivo para página de producto
class Product3DViewer {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.model = null;
        this.autoRotate = true;
        this.isLoading = false;
        
        this.init();
    }

    init() {
        // Esperar a que el DOM esté listo y se cargue el producto
        document.addEventListener('DOMContentLoaded', () => {
            // Esperar un poco más para asegurar que product.js haya cargado los datos
            setTimeout(() => this.setupViewer(), 100);
        });
    }

    setupViewer() {
        const container = document.getElementById('product-3d-viewer');
        if (!container) {
            console.error('Contenedor del visor 3D no encontrado');
            return;
        }

        // Verificar si el producto tiene modelo 3D
        const productData = this.getProductData();
        if (!productData || !productData.modelo_3d) {
            this.showNoModelMessage();
            return;
        }

        // Inicializar Three.js
        this.initThreeJS(container);
        
        // Configurar controles
        this.setupControls();
        
        // Cargar modelo
        this.loadModel(productData.modelo_3d);
        
        // Iniciar animación
        this.animate();
    }

    getProductData() {
        // Intentar obtener datos del producto desde product.js
        if (window.currentProduct) {
            return window.currentProduct;
        }
        
        // Fallback: obtener datos de la página
        const productId = new URLSearchParams(window.location.search).get('id');
        if (productId) {
            // Hacer petición directa para obtener datos del producto
            this.fetchProductData(productId);
            return null;
        }
        
        return null;
    }

    async fetchProductData(productId) {
        try {
            const response = await fetch(`php/get_producto.php?id=${productId}`);
            if (response.ok) {
                const product = await response.json();
                if (product.modelo_3d) {
                    this.loadModel(product.modelo_3d);
                } else {
                    this.showNoModelMessage();
                }
            }
        } catch (error) {
            console.error('Error fetching product data:', error);
            this.showErrorMessage('Error al cargar el modelo 3D');
        }
    }

    initThreeJS(container) {
        // Crear escena
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf8f9fa);

        // Crear cámara
        this.camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
        this.camera.position.z = 5;

        // Crear renderer
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true 
        });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Limpiar contenedor y agregar renderer
        container.innerHTML = '';
        container.appendChild(this.renderer.domElement);

        // Configurar controles de órbita
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.rotateSpeed = 0.5;
        this.controls.autoRotate = this.autoRotate;
        this.controls.autoRotateSpeed = 1.0;
        this.controls.enableZoom = true;
        this.controls.enablePan = false;
        this.controls.minDistance = 2;
        this.controls.maxDistance = 10;

        // Configurar luces
        this.setupLights();

        // Configurar responsive
        this.setupResponsive(container);
    }

    setupLights() {
        // Luz ambiental
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        // Luz direccional principal
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 10, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);

        // Luz de relleno
        const fillLight = new THREE.DirectionalLight(0x4000FF, 0.3);
        fillLight.position.set(-5, -5, 3);
        this.scene.add(fillLight);

        // Luz de acento
        const accentLight = new THREE.PointLight(0x00FF0C, 0.2);
        accentLight.position.set(0, 8, 2);
        this.scene.add(accentLight);
    }

    setupControls() {
        // Botón de rotación automática
        const autoRotateBtn = document.getElementById('auto-rotate');
        if (autoRotateBtn) {
            autoRotateBtn.addEventListener('click', () => {
                this.autoRotate = !this.autoRotate;
                this.controls.autoRotate = this.autoRotate;
                autoRotateBtn.classList.toggle('active', this.autoRotate);
            });
        }

        // Botón de reset
        const resetBtn = document.getElementById('reset-view');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.controls.reset();
                this.camera.position.set(0, 0, 5);
                this.controls.update();
            });
        }

        // Controles de zoom
        const zoomInBtn = document.getElementById('zoom-in');
        const zoomOutBtn = document.getElementById('zoom-out');
        
        if (zoomInBtn) {
            zoomInBtn.addEventListener('click', () => {
                this.camera.position.multiplyScalar(0.9);
                this.controls.update();
            });
        }
        
        if (zoomOutBtn) {
            zoomOutBtn.addEventListener('click', () => {
                this.camera.position.multiplyScalar(1.1);
                this.controls.update();
            });
        }
    }

    loadModel(modelPath) {
        if (this.isLoading) return;
        
        this.isLoading = true;
        const container = document.getElementById('product-3d-viewer');
        container.classList.add('loading');

        // Mostrar loading
        container.innerHTML = `
            <div class="model-loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Cargando modelo 3D...</p>
            </div>
        `;

        // Cargador para FBX
        const fbxLoader = new THREE.FBXLoader();
        
        fbxLoader.load(
            modelPath,
            (object) => {
                this.model = object;
                this.processModel(object);
                this.showModel();
                this.isLoading = false;
            },
            (progress) => {
                // Opcional: mostrar progreso de carga
                const progressPercent = (progress.loaded / progress.total * 100).toFixed(1);
                console.log(`Cargando modelo: ${progressPercent}%`);
            },
            (error) => {
                console.error('Error cargando modelo FBX:', error);
                this.showErrorMessage('Error al cargar el modelo 3D');
                this.isLoading = false;
            }
        );
    }

    processModel(object) {
        // Centrar y escalar modelo
        const box = new THREE.Box3().setFromObject(object);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        object.position.x = -center.x;
        object.position.y = -center.y;
        object.position.z = -center.z;

        // Escalar para que quepa en la vista
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 3 / maxDim;
        object.scale.setScalar(scale);

        // Configurar sombras y materiales
        object.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                
                // Mejorar materiales si es necesario
                if (child.material) {
                    child.material.metalness = 0.1;
                    child.material.roughness = 0.8;
                }
            }
        });

        this.scene.add(object);
    }

    showModel() {
        const container = document.getElementById('product-3d-viewer');
        container.classList.remove('loading');
        container.classList.add('loaded');
        container.innerHTML = '';
        container.appendChild(this.renderer.domElement);

        // Agregar indicador de modelo 3D
        const indicator = document.createElement('div');
        indicator.className = 'model-3d-indicator';
        indicator.innerHTML = '<i class="fas fa-cube"></i> Vista 3D';
        container.appendChild(indicator);
    }

    showNoModelMessage() {
        const container = document.getElementById('product-3d-viewer');
        container.classList.add('error');
        container.innerHTML = `
            <div class="model-loading">
                <i class="fas fa-cube"></i>
                <p>Este producto no tiene vista 3D disponible</p>
                <small>Consulta la galería de imágenes</small>
            </div>
        `;
        
        // Ocultar controles
        this.hideControls();
    }

    showErrorMessage(message) {
        const container = document.getElementById('product-3d-viewer');
        container.classList.add('error');
        container.innerHTML = `
            <div class="model-loading">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${message}</p>
            </div>
        `;
        
        this.hideControls();
    }

    hideControls() {
        const controls = document.querySelector('.model-controls');
        if (controls) {
            controls.style.display = 'none';
        }
    }

    setupResponsive(container) {
        const resizeObserver = new ResizeObserver(() => {
            this.camera.aspect = container.clientWidth / container.clientHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(container.clientWidth, container.clientHeight);
        });

        resizeObserver.observe(container);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        if (this.controls) {
            this.controls.update();
        }

        this.renderer.render(this.scene, this.camera);
    }
}

// Inicializar el visor 3D cuando se cargue la página
let productViewer = null;

document.addEventListener('DOMContentLoaded', () => {
    // Esperar a que product.js cargue los datos
    setTimeout(() => {
        productViewer = new Product3DViewer();
    }, 500);
});

// Exportar para uso global
window.Product3DViewer = Product3DViewer;