function initContactPage() {
    initContactForm();
}

function initContactForm() {
    
    const form = document.getElementById('contactForm');
    if (!form) {
        return;
    }
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const button = this.querySelector('.btn-submit');
        const originalText = button.textContent;
        
        button.textContent = 'Enviando...';
        button.disabled = true;
        
        try {
            const formData = new FormData(this);
            const response = await fetch('php/contacto.php', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                showMessage(result.message, 'success');
                form.reset();
            } else {
                showMessage(result.message, 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showMessage('Error al enviar el mensaje', 'error');
        } finally {
            button.textContent = originalText;
            button.disabled = false;
        }
    });
    
    function showMessage(message, type) {
        let messageDiv = document.getElementById('contact-message');
        if (!messageDiv) {
            messageDiv = document.createElement('div');
            messageDiv.id = 'contact-message';
            messageDiv.style.cssText = `
                margin-top: 20px;
                padding: 15px;
                border-radius: 5px;
                font-weight: 500;
                text-align: center;
            `;
            form.parentNode.insertBefore(messageDiv, form.nextSibling);
        }
        
        messageDiv.textContent = message;
        messageDiv.style.display = 'block';
        messageDiv.style.background = type === 'success' ? '#d4edda' : '#f8d7da';
        messageDiv.style.color = type === 'success' ? '#155724' : '#721c24';
        messageDiv.style.border = type === 'success' ? '1px solid #c3e6cb' : '1px solid #f5c6cb';
        
        if (type === 'success') {
            setTimeout(() => {
                messageDiv.style.display = 'none';
            }, 5000);
        }
    }
}

// Ejecución
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initContactPage);
} else {
    initContactPage();
}