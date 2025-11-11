<?php
header('Content-Type: application/json');
require_once 'conexion.php';

if (isset($_GET['q']) && !empty($_GET['q'])) {
    $searchTerm = '%' . $_GET['q'] . '%';
    
    try {
        $stmt = $pdo->prepare("
            SELECT * FROM productos 
            WHERE nombre LIKE ? 
            AND activo = 1 
            ORDER BY nombre ASC
        ");
        
        $stmt->execute([$searchTerm]);
        $productos = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'results' => $productos,
            'count' => count($productos)
        ]);
        
    } catch(PDOException $e) {
        echo json_encode([
            'success' => false,
            'error' => 'Error en la búsqueda: ' . $e->getMessage()
        ]);
    }
} else {
    echo json_encode([
        'success' => false,
        'error' => 'Término de búsqueda vacío'
    ]);
}
?>