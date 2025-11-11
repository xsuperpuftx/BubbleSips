<?php
header('Content-Type: application/json');
require_once 'cart_functions.php';

try {
    $response = $cartManager->processOrder();
    echo json_encode($response);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>