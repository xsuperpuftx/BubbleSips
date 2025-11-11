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

function getProductos() {
    global $pdo;
    
    try {
        $stmt = $pdo->query("SELECT * FROM productos WHERE activo = 1 ORDER BY id DESC");
        $productos = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
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
            if (!isset($data[$field]) || empty($data[$field])) {
                throw new Exception("Campo requerido faltante: $field");
            }
        }
        
        $stmt = $pdo->prepare("INSERT INTO productos (nombre, descripcion, precio, imagen, stock, categoria, tags) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $data['nombre'],
            $data['descripcion'],
            floatval($data['precio']),
            $data['imagen'] ?? '',
            intval($data['stock']),
            $data['categoria'] ?? 'sodas',
            $data['tags'] ?? ''
        ]);
        
        $id = $pdo->lastInsertId();
        echo json_encode([
            'success' => true, 
            'id' => $id, 
            'message' => 'Producto creado exitosamente'
        ]);
    } catch(PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Error al crear producto: ' . $e->getMessage()]);
    }
}

function updateProducto($data) {
    global $pdo;
    
    try {
        if (!isset($data['id'])) {
            throw new Exception('ID de producto no proporcionado');
        }
        
        $stmt = $pdo->prepare("UPDATE productos SET nombre = ?, descripcion = ?, precio = ?, imagen = ?, stock = ?, categoria = ?, tags = ? WHERE id = ?");
        $stmt->execute([
            $data['nombre'],
            $data['descripcion'],
            floatval($data['precio']),
            $data['imagen'] ?? '',
            intval($data['stock']),
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
    }
}

function deleteProducto($id) {
    global $pdo;
    
    try {
        if (!is_numeric($id)) {
            throw new Exception('ID de producto inválido');
        }
        
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
        
    } catch(PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Error al eliminar producto: ' . $e->getMessage()]);
    }
}
?>