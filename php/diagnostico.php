<?php
header('Content-Type: application/json');
require_once 'conexion.php';

try {
    $stmt1 = $pdo->query("SELECT id, nombre, activo FROM productos ORDER BY id");
    $todos = $stmt1->fetchAll(PDO::FETCH_ASSOC);
    $stmt2 = $pdo->query("SELECT id, nombre, activo FROM productos WHERE activo = 1 OR activo IS NULL ORDER BY id");
    $activos = $stmt2->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'diagnostico' => [
            'total_productos' => count($todos),
            'productos_activos' => count($activos),
            'todos_los_productos' => $todos,
            'productos_filtrados' => $activos
        ]
    ]);
    
} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error: ' . $e->getMessage()]);
}
?>