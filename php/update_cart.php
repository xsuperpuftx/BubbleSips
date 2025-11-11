<?php
header('Content-Type: application/json');
require_once 'cart_functions.php';

$action = $_POST['action'] ?? '';
$productId = isset($_POST['productId']) ? intval($_POST['productId']) : null;
$quantity = isset($_POST['quantity']) ? intval($_POST['quantity']) : 1;

$response = [];

try {
    switch ($action) {
        case 'add':
            $response = $cartManager->addToCart($productId, $quantity);
            break;
            
        case 'remove':
            $response = $cartManager->removeFromCart($productId);
            break;
            
        case 'update':
            $response = $cartManager->updateQuantity($productId, $quantity);
            break;
            
        case 'clear':
            $response = $cartManager->clearCart();
            break;
            
        case 'get':
            $response = [
                'success' => true,
                'cart' => $cartManager->getCart(),
                'total' => $cartManager->getCartTotal(),
                'count' => $cartManager->getCartCount()
            ];
            break;
            
        default:
            throw new Exception('Acción no válida');
    }
} catch (Exception $e) {
    $response = ['success' => false, 'message' => $e->getMessage()];
}

echo json_encode($response);
?>