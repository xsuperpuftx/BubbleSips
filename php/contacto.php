<?php
header('Content-Type: application/json');
require_once 'conexion.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $nombre = trim($_POST['name']);
    $email = filter_var($_POST['email'], FILTER_VALIDATE_EMAIL);
    $asunto = trim($_POST['subject']);
    $mensaje = trim($_POST['message']);
    
    if (empty($nombre) || strlen($nombre) < 2) {
        echo json_encode(['success' => false, 'message' => 'Por favor ingresa un nombre válido (mínimo 2 caracteres)']);
        exit;
    }
    
    if (!$email) {
        echo json_encode(['success' => false, 'message' => 'Por favor ingresa un email válido']);
        exit;
    }
    
    if (empty($mensaje) || strlen($mensaje) < 10) {
        echo json_encode(['success' => false, 'message' => 'Por favor escribe un mensaje más detallado (mínimo 10 caracteres)']);
        exit;
    }
    
    try {
        $stmt = $pdo->prepare("INSERT INTO mensajes_contacto (nombre, email, asunto, mensaje) VALUES (?, ?, ?, ?)");
        $stmt->execute([$nombre, $email, $asunto, $mensaje]);
        
        echo json_encode([
            'success' => true, 
            'message' => '¡Gracias por tu mensaje! Te contactaremos pronto.'
        ]);
        
    } catch(PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Error al enviar el mensaje: ' . $e->getMessage()]);
    }
} else {
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
}
?>