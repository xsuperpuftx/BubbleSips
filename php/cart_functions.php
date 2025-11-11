<?php
session_start();
require_once 'conexion.php';

class CartManager {
    private $pdo;
    
    public function __construct($pdo) {
        $this->pdo = $pdo;
    }
    
    public function initCart() {
        if (!isset($_SESSION['cart'])) {
            $_SESSION['cart'] = [];
        }
        return $_SESSION['cart'];
    }
    
    public function addToCart($productId, $quantity = 1) {
        $this->initCart();
        
        $stmt = $this->pdo->prepare("SELECT stock, nombre, precio FROM productos WHERE id = ? AND activo = 1");
        $stmt->execute([$productId]);
        $product = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$product) {
            return ['success' => false, 'message' => 'Producto no encontrado'];
        }
        
        if ($product['stock'] < $quantity) {
            return ['success' => false, 'message' => 'Stock insuficiente'];
        }
        
        if (isset($_SESSION['cart'][$productId])) {
            $_SESSION['cart'][$productId]['quantity'] += $quantity;
        } else {
            $_SESSION['cart'][$productId] = [
                'id' => $productId,
                'nombre' => $product['nombre'],
                'precio' => $product['precio'],
                'quantity' => $quantity,
                'imagen' => $product['imagen'] ?? ''
            ];
        }
        return ['success' => true, 'cart_count' => $this->getCartCount()];
    }
    
    public function removeFromCart($productId) {
        if (isset($_SESSION['cart'][$productId])) {
            unset($_SESSION['cart'][$productId]);
            return ['success' => true, 'cart_count' => $this->getCartCount()];
        }
        return ['success' => false, 'message' => 'Producto no encontrado en el carrito'];
    }
    
    public function updateQuantity($productId, $quantity) {
        if ($quantity <= 0) {
            return $this->removeFromCart($productId);
        }
        
        if (isset($_SESSION['cart'][$productId])) {
            $stmt = $this->pdo->prepare("SELECT stock FROM productos WHERE id = ?");
            $stmt->execute([$productId]);
            $product = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($product && $quantity <= $product['stock']) {
                $_SESSION['cart'][$productId]['quantity'] = $quantity;
                return ['success' => true, 'cart_count' => $this->getCartCount()];
            } else {
                return ['success' => false, 'message' => 'Stock insuficiente'];
            }
        }
        return ['success' => false, 'message' => 'Producto no encontrado en el carrito'];
    }
    
    public function getCartCount() {
        $this->initCart();
        $count = 0;
        foreach ($_SESSION['cart'] as $item) {
            $count += $item['quantity'];
        }
        return $count;
    }
    
    public function getCart() {
        $this->initCart();
        return $_SESSION['cart'];
    }
    
    public function clearCart() {
        $_SESSION['cart'] = [];
        return ['success' => true];
    }
    
    public function getCartTotal() {
        $this->initCart();
        $total = 0;
        foreach ($_SESSION['cart'] as $item) {
            $total += $item['precio'] * $item['quantity'];
        }
        return $total;
    }
    
    public function processOrder() {
        $this->initCart();
        
        if (empty($_SESSION['cart'])) {
            return ['success' => false, 'message' => 'Carrito vacío'];
        }
        
        try {
            $this->pdo->beginTransaction();
            
            foreach ($_SESSION['cart'] as $productId => $item) {
                $stmt = $this->pdo->prepare("SELECT stock FROM productos WHERE id = ? FOR UPDATE");
                $stmt->execute([$productId]);
                $product = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if (!$product || $product['stock'] < $item['quantity']) {
                    throw new Exception("Stock insuficiente para: " . $item['nombre']);
                }
            }
        
            foreach ($_SESSION['cart'] as $productId => $item) {
                $stmt = $this->pdo->prepare("UPDATE productos SET stock = stock - ? WHERE id = ?");
                $stmt->execute([$item['quantity'], $productId]);
            }
            
            $orderData = [
                'total' => $this->getCartTotal(),
                'items' => $_SESSION['cart']
            ];
            
            $this->pdo->commit();
            $this->clearCart();
            
            return ['success' => true, 'order' => $orderData];
            
        } catch (Exception $e) {
            $this->pdo->rollBack();
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }
}
$cartManager = new CartManager($pdo);
?>