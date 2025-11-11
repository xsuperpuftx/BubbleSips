<?php
header('Content-Type: application/json');
require_once 'conexion.php';

try {
    $stmt = $pdo->query("SELECT * FROM productos WHERE activo = 1 OR activo IS NULL ORDER BY id DESC");
    $productos = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($productos);
    
} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error al obtener productos: ' . $e->getMessage()]);
}
?>