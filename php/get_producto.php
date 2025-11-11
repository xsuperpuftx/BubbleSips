<?php
header('Content-Type: application/json');
require_once 'conexion.php';

try {
    if (!isset($_GET['id']) || empty($_GET['id'])) {
        throw new Exception('ID de producto no proporcionado');
    }
    
    $productId = intval($_GET['id']);
    
    $stmt = $pdo->prepare("SELECT * FROM productos WHERE id = ? AND (activo = 1 OR activo IS NULL)");
    $stmt->execute([$productId]);
    $product = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$product) {
        throw new Exception('Producto no encontrado');
    }
    
    echo json_encode($product);
    
} catch (Exception $e) {
    http_response_code(404);
    echo json_encode(['error' => $e->getMessage()]);
}
?>