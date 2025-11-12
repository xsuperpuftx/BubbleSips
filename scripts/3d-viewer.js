// 3d-viewer.js - Visor de modelo 3D para el hero section
class Modelo3DViewer {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.model = null;
        this.autoRotate = true;
        this.mouseX = 0;
        this.mouseY = 0;
        this.targetRotationX = 0;
        this.targetRotationY = 0;
        
        this.init();
    }

    init() {
        // Crear escena
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf5f5f5);

        // Crear cámara
        this.camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        this.camera.position.z = 5;

        // Crear renderer
        const container = document.getElementById('visor3d');
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.shadowMap.enabled = true;
        container.appendChild(this.renderer.domElement);

        // Configurar luces
        this.setupLights();

        // Cargar modelo
        this.loadModel();

        // Configurar controles
        this.setupControls();

        // Configurar responsive
        this.setupResponsive();

        // Iniciar animación
        this.animate();
    }

    setupLights() {
        // Luz ambiental
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        // Luz direccional
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 10, 5);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);

        // Luz puntual para efectos
        const pointLight = new THREE.PointLight(0x4000FF, 0.3);
        pointLight.position.set(-5, -5, 5);
        this.scene.add(pointLight);
    }

    loadModel() {
    // Mostrar loading
    const container = document.getElementById('visor3d');
    container.innerHTML = '<div class="modelo-loading">Cargando modelo 3D...</div>';

    // Primero cargar los materiales (.mtl)
    const mtlLoader = new THREE.MTLLoader();
    mtlLoader.setPath('models/'); // Ruta donde están tus archivos
    
    mtlLoader.load('SodaVerde.mtl', (materials) => {
        materials.preload();
        
        // Configurar el loader OBJ con los materiales cargados
        const objLoader = new THREE.OBJLoader();
        objLoader.setMaterials(materials);
        objLoader.setPath('models/'); // Misma ruta
        
        // Cargar el modelo .obj
        objLoader.load('SodaVerde.obj', (object) => {
            this.model = object;
            
            // Centrar y escalar modelo
            const box = new THREE.Box3().setFromObject(this.model);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());

            this.model.position.x = -center.x;
            this.model.position.y = -center.y;
            this.model.position.z = -center.z;

            // Escalar para que quepa en la vista
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 3 / maxDim;
            this.model.scale.setScalar(scale);

            this.scene.add(this.model);
            
            // Quitar loading
            container.innerHTML = '';
            container.appendChild(this.renderer.domElement);
            
            console.log('Modelo cargado correctamente con texturas');
        },
        (progress) => {
            console.log('Cargando geometría: ' + (progress.loaded / progress.total * 100) + '%');
        },
        (error) => {
            console.error('Error cargando modelo OBJ:', error);
            container.innerHTML = '<div class="modelo-loading">Error cargando el modelo 3D</div>';
        });
    },
    (progress) => {
        console.log('Cargando materiales: ' + (progress.loaded / progress.total * 100) + '%');
    },
    (error) => {
        console.error('Error cargando materiales MTL:', error);
        // Si falla el MTL, intentar cargar solo el OBJ con materiales básicos
        this.loadModelWithoutMTL();
    });
}

// Método de respaldo si falla el MTL
loadModelWithoutMTL() {
    const objLoader = new THREE.OBJLoader();
    objLoader.setPath('models/');
    
    objLoader.load('SodaVerde.obj', (object) => {
        this.model = object;
        
        // Aplicar materiales básicos
        this.model.traverse((child) => {
            if (child.isMesh) {
                child.material = new THREE.MeshPhongMaterial({ 
                    color: 0x4000FF,
                    shininess: 100,
                    specular: 0x222222
                });
            }
        });

        // ... resto del código de centrado y escalado
        const box = new THREE.Box3().setFromObject(this.model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        this.model.position.x = -center.x;
        this.model.position.y = -center.y;
        this.model.position.z = -center.z;

        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 3 / maxDim;
        this.model.scale.setScalar(scale);

        this.scene.add(this.model);
        
        const container = document.getElementById('visor3d');
        container.innerHTML = '';
        container.appendChild(this.renderer.domElement);
    });
}
    setupControls() {
        // Controles de rotación automática/manual
        document.getElementById('rotar-auto').addEventListener('click', () => {
            this.autoRotate = true;
            document.getElementById('rotar-auto').classList.add('active');
            document.getElementById('rotar-manual').classList.remove('active');
        });

        document.getElementById('rotar-manual').addEventListener('click', () => {
            this.autoRotate = false;
            document.getElementById('rotar-manual').classList.add('active');
            document.getElementById('rotar-auto').classList.remove('active');
        });

        // Interacción con mouse
        const container = document.getElementById('visor3d');
        container.addEventListener('mousemove', (event) => {
            if (!this.autoRotate) {
                const rect = container.getBoundingClientRect();
                this.mouseX = (event.clientX - rect.left) / container.clientWidth * 2 - 1;
                this.mouseY = -(event.clientY - rect.top) / container.clientHeight * 2 + 1;
                
                this.targetRotationY = this.mouseX * Math.PI;
                this.targetRotationX = this.mouseY * Math.PI * 0.5;
            }
        });
    }

    setupResponsive() {
        window.addEventListener('resize', () => {
            const container = document.getElementById('visor3d');
            this.camera.aspect = container.clientWidth / container.clientHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(container.clientWidth, container.clientHeight);
        });
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        if (this.model) {
            if (this.autoRotate) {
                // Rotación automática suave
                this.model.rotation.y += 0.01;
                this.model.rotation.x = Math.sin(Date.now() * 0.001) * 0.1;
            } else {
                // Rotación manual suavizada
                this.model.rotation.y += (this.targetRotationY - this.model.rotation.y) * 0.1;
                this.model.rotation.x += (this.targetRotationX - this.model.rotation.x) * 0.1;
            }

            // Efecto de flotación
            this.model.position.y = Math.sin(Date.now() * 0.002) * 0.1;
        }

        this.renderer.render(this.scene, this.camera);
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    new Modelo3DViewer();
});