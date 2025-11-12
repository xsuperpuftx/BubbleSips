<?php
header('Content-Type: application/json; charset=utf-8');
require_once 'conexion.php';

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

$method = $_SERVER['REQUEST_METHOD'];

try {
    switch($method) {
        case 'GET':
            if(isset($_GET['id'])) {
                getProducto($_GET['id']);
            } else {
                getProductos();
            }
            break;
        
        case 'POST':
            $input = file_get_contents('php://input');
            $data = json_decode($input, true);
            
            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new Exception('JSON inválido: ' . json_last_error_msg());
            }
            
            if(isset($data['id'])) {
                updateProducto($data);
            } else {
                createProducto($data);
            }
            break;
        
        case 'DELETE':
            if(isset($_GET['id'])) {
                deleteProducto($_GET['id']);
            } else {
                throw new Exception('ID no proporcionado para eliminar');
            }
            break;
        
        default:
            http_response_code(405);
            echo json_encode(['error' => 'Método no permitido']);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

// Función para procesar imágenes base64
function procesarImagen($base64Image) {
    // Si la imagen está vacía o es una URL, devolverla tal cual
    if (empty($base64Image)) {
        return '';
    }
    
    // Si ya es una URL (de una imagen existente), devolverla
    if (filter_var($base64Image, FILTER_VALIDATE_URL) || strpos($base64Image, 'uploads/') === 0) {
        return $base64Image;
    }
    
    // Si es base64, procesarla
    if (strpos($base64Image, 'data:image') === 0) {
        // Extraer la parte base64
        $parts = explode(',', $base64Image);
        if (count($parts) === 2) {
            $imageData = base64_decode($parts[1]);
            
            // Validar que se pudo decodificar
            if ($imageData === false) {
                throw new Exception('Error al decodificar la imagen base64');
            }
            
            // Determinar la extensión del archivo
            $extension = 'png';
            $mimeType = $parts[0];
            
            if (strpos($mimeType, 'jpeg') !== false || strpos($mimeType, 'jpg') !== false) {
                $extension = 'jpg';
            } elseif (strpos($mimeType, 'gif') !== false) {
                $extension = 'gif';
            } elseif (strpos($mimeType, 'webp') !== false) {
                $extension = 'webp';
            }
            
            // Crear nombre único para la imagen
            $filename = 'product_' . uniqid() . '_' . time() . '.' . $extension;
            $filepath = '../uploads/' . $filename;
            
            // Crear directorio si no existe
            if (!file_exists('../uploads')) {
                if (!mkdir('../uploads', 0777, true)) {
                    throw new Exception('No se pudo crear el directorio de uploads');
                }
            }
            
            // Validar que es una imagen válida
            $imageInfo = getimagesizefromstring($imageData);
            if ($imageInfo === false) {
                throw new Exception('El archivo no es una imagen válida');
            }
            
            // Guardar la imagen
            if (file_put_contents($filepath, $imageData)) {
                return 'uploads/' . $filename;
            } else {
                throw new Exception('Error al guardar la imagen en el servidor');
            }
        }
    }
    
    // Si no es base64 ni URL, devolver vacío
    return '';
}

function getProductos() {
    global $pdo;
    
    try {
        $stmt = $pdo->query("SELECT * FROM productos WHERE activo = 1 ORDER BY id DESC");
        $productos = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Procesar URLs de imágenes para asegurar que sean accesibles
        foreach ($productos as &$producto) {
            if (!empty($producto['imagen']) && strpos($producto['imagen'], 'uploads/') === 0) {
                // La imagen ya está en formato correcto
                $producto['imagen'] = $producto['imagen'];
            } elseif (!empty($producto['imagen']) && strpos($producto['imagen'], 'data:image') === 0) {
                // Si es base64, convertirla a archivo (para productos existentes)
                try {
                    $producto['imagen'] = procesarImagen($producto['imagen']);
                } catch (Exception $e) {
                    // Si hay error al procesar, usar imagen por defecto
                    $producto['imagen'] = '';
                }
            }
        }
        
        echo json_encode($productos, JSON_UNESCAPED_UNICODE);
    } catch(PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Error al obtener productos: ' . $e->getMessage()]);
    }
}

function getProducto($id) {
    global $pdo;
    
    try {
        // Validar que el ID sea numérico
        if (!is_numeric($id)) {
            http_response_code(400);
            echo json_encode(['error' => 'ID de producto inválido']);
            return;
        }
        
        $stmt = $pdo->prepare("SELECT * FROM productos WHERE id = ?");
        $stmt->execute([$id]);
        $producto = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if($producto) {
            // Procesar imagen si es necesario
            if (!empty($producto['imagen']) && strpos($producto['imagen'], 'data:image') === 0) {
                try {
                    $producto['imagen'] = procesarImagen($producto['imagen']);
                } catch (Exception $e) {
                    $producto['imagen'] = '';
                }
            }
            
            echo json_encode($producto, JSON_UNESCAPED_UNICODE);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Producto no encontrado']);
        }
    } catch(PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Error al obtener producto: ' . $e->getMessage()]);
    }
}

function createProducto($data) {
    global $pdo;
    
    try {
        // Validar datos requeridos
        $required = ['nombre', 'precio', 'descripcion', 'stock'];
        foreach ($required as $field) {
            if (!isset($data[$field]) || empty(trim($data[$field]))) {
                throw new Exception("Campo requerido faltante: $field");
            }
        }
        
        // Validar precio
        $precio = floatval($data['precio']);
        if ($precio <= 0) {
            throw new Exception("El precio debe ser mayor a 0");
        }
        
        // Validar stock
        $stock = intval($data['stock']);
        if ($stock < 0) {
            throw new Exception("El stock no puede ser negativo");
        }
        
        // Procesar imagen
        $imagen = '';
        if (isset($data['imagen']) && !empty($data['imagen'])) {
            try {
                $imagen = procesarImagen($data['imagen']);
            } catch (Exception $e) {
                // Si hay error al procesar la imagen, continuar sin imagen
                $imagen = '';
                error_log("Error procesando imagen: " . $e->getMessage());
            }
        }
        
        $stmt = $pdo->prepare("INSERT INTO productos (nombre, descripcion, precio, imagen, stock, categoria, tags, activo) VALUES (?, ?, ?, ?, ?, ?, ?, 1)");
        $stmt->execute([
            trim($data['nombre']),
            trim($data['descripcion']),
            $precio,
            $imagen,
            $stock,
            $data['categoria'] ?? 'sodas',
            $data['tags'] ?? ''
        ]);
        
        $id = $pdo->lastInsertId();
        
        // Obtener el producto recién creado para devolverlo completo
        $stmt = $pdo->prepare("SELECT * FROM productos WHERE id = ?");
        $stmt->execute([$id]);
        $nuevoProducto = $stmt->fetch(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true, 
            'id' => $id,
            'producto' => $nuevoProducto,
            'message' => 'Producto creado exitosamente'
        ]);
    } catch(PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Error al crear producto: ' . $e->getMessage()]);
    } catch (Exception $e) {
        http_response_code(400);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function updateProducto($data) {
    global $pdo;
    
    try {
        if (!isset($data['id'])) {
            throw new Exception('ID de producto no proporcionado');
        }
        
        // Validar que el producto existe
        $stmt = $pdo->prepare("SELECT * FROM productos WHERE id = ?");
        $stmt->execute([$data['id']]);
        $productoExistente = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$productoExistente) {
            throw new Exception('Producto no encontrado');
        }
        
        // Validar datos requeridos
        $required = ['nombre', 'precio', 'descripcion', 'stock'];
        foreach ($required as $field) {
            if (!isset($data[$field]) || empty(trim($data[$field]))) {
                throw new Exception("Campo requerido faltante: $field");
            }
        }
        
        // Validar precio
        $precio = floatval($data['precio']);
        if ($precio <= 0) {
            throw new Exception("El precio debe ser mayor a 0");
        }
        
        // Validar stock
        $stock = intval($data['stock']);
        if ($stock < 0) {
            throw new Exception("El stock no puede ser negativo");
        }
        
        // Procesar imagen
        $imagen = $productoExistente['imagen']; // Mantener imagen existente por defecto
        
        if (isset($data['imagen']) && !empty($data['imagen'])) {
            if ($data['imagen'] !== $productoExistente['imagen']) {
                // Solo procesar si la imagen es nueva
                try {
                    $nuevaImagen = procesarImagen($data['imagen']);
                    if (!empty($nuevaImagen)) {
                        // Eliminar imagen anterior si existe y es un archivo local
                        if (!empty($productoExistente['imagen']) && 
                            strpos($productoExistente['imagen'], 'uploads/') === 0 &&
                            file_exists('../' . $productoExistente['imagen'])) {
                            unlink('../' . $productoExistente['imagen']);
                        }
                        $imagen = $nuevaImagen;
                    }
                } catch (Exception $e) {
                    // Si hay error al procesar la nueva imagen, mantener la existente
                    error_log("Error procesando nueva imagen: " . $e->getMessage());
                }
            }
        } elseif (isset($data['imagen']) && empty($data['imagen'])) {
            // Si se envía imagen vacía, eliminar la imagen existente
            if (!empty($productoExistente['imagen']) && 
                strpos($productoExistente['imagen'], 'uploads/') === 0 &&
                file_exists('../' . $productoExistente['imagen'])) {
                unlink('../' . $productoExistente['imagen']);
            }
            $imagen = '';
        }
        
        $stmt = $pdo->prepare("UPDATE productos SET nombre = ?, descripcion = ?, precio = ?, imagen = ?, stock = ?, categoria = ?, tags = ? WHERE id = ?");
        $stmt->execute([
            trim($data['nombre']),
            trim($data['descripcion']),
            $precio,
            $imagen,
            $stock,
            $data['categoria'] ?? 'sodas',
            $data['tags'] ?? '',
            $data['id']
        ]);
        
        echo json_encode([
            'success' => true, 
            'message' => 'Producto actualizado exitosamente'
        ]);
    } catch(PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Error al actualizar producto: ' . $e->getMessage()]);
    } catch (Exception $e) {
        http_response_code(400);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function deleteProducto($id) {
    global $pdo;
    
    try {
        if (!is_numeric($id)) {
            throw new Exception('ID de producto inválido');
        }
        
        // Obtener información del producto para eliminar su imagen
        $stmt = $pdo->prepare("SELECT imagen FROM productos WHERE id = ?");
        $stmt->execute([$id]);
        $producto = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($producto) {
            // Eliminar la imagen del servidor si existe
            if (!empty($producto['imagen']) && 
                strpos($producto['imagen'], 'uploads/') === 0 &&
                file_exists('../' . $producto['imagen'])) {
                unlink('../' . $producto['imagen']);
            }
            
            // Eliminar el producto de la base de datos
            $stmt = $pdo->prepare("DELETE FROM productos WHERE id = ?");
            $stmt->execute([$id]);
            
            if ($stmt->rowCount() > 0) {
                echo json_encode([
                    'success' => true, 
                    'message' => 'Producto eliminado permanentemente'
                ]);
            } else {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'error' => 'No se encontró el producto para eliminar'
                ]);
            }
        } else {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'error' => 'Producto no encontrado'
            ]);
        }
        
    } catch(PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Error al eliminar producto: ' . $e->getMessage()]);
    }
}
?>