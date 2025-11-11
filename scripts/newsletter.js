document.addEventListener('DOMContentLoaded', function() {
    const newsletterForm = document.getElementById('newsletter-form');
    const newsletterMessage = document.getElementById('newsletter-message');
    
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const email = formData.get('email');
            
            // Validación básica del email
            if (!email || !isValidEmail(email)) {
                showNewsletterMessage('Por favor ingresa un email válido', 'error');
                return;
            }
            
            try {
                const response = await fetch('php/newsletter.php', {
                    method: 'POST',
                    body: formData
                });
                
                const result = await response.json();
                
                if (result.success) {
                    showNewsletterMessage(result.message, 'success');
                    newsletterForm.reset();
                } else {
                    showNewsletterMessage(result.message, 'error');
                }
            } catch (error) {
                console.error('Error al suscribirse:', error);
                showNewsletterMessage('Error al procesar la suscripción. Intenta nuevamente.', 'error');
            }
        });
    }
    
    function showNewsletterMessage(message, type) {
        if (!newsletterMessage) return;
        
        newsletterMessage.textContent = message;
        newsletterMessage.style.display = 'block';
        newsletterMessage.style.background = type === 'success' ? '#d4edda' : '#f8d7da';
        newsletterMessage.style.color = type === 'success' ? '#155724' : '#721c24';
        newsletterMessage.style.border = type === 'success' ? '1px solid #c3e6cb' : '1px solid #f5c6cb';
        
        // Ocultar mensaje después de 5 segundos
        setTimeout(() => {
            newsletterMessage.style.display = 'none';
        }, 5000);
    }
    
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
});