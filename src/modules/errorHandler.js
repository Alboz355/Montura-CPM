// errorHandler.js

const errorHandler = {
    // Gestion des erreurs réseau
    handleNetworkError(error) {
        const networkErrors = {
            'ECONNREFUSED': { type: 'connection_refused', message: 'Serveur inaccessible' },
            'ETIMEDOUT': { type: 'connection_timeout', message: 'Délai de connexion dépassé' },
            'ENOTFOUND': { type: 'domain_not_found', message: 'Nom de domaine non trouvé' },
            'ECONNRESET': { type: 'connection_reset', message: 'Connexion réinitialisée' },
            'EHOSTUNREACH': { type: 'host_unreachable', message: 'Hôte inaccessible' }
        };

        const code = error.code || error.type;
        const errorData = networkErrors[code] || { type: 'network_error', message: 'Erreur réseau' };
        
        console.error('Erreur réseau:', error);
        throw new Error(`Erreur réseau: ${errorData.message}`);
    },

    // Gestion des erreurs de validation
    handleValidationError(error) {
        const validationErrors = {
            'required': { type: 'required', message: 'Ce champ est requis' },
            'min': { type: 'min_value', message: 'Valeur minimale non atteinte' },
            'max': { type: 'max_value', message: 'Valeur maximale dépassée' },
            'invalid': { type: 'invalid_value', message: 'Valeur invalide' },
            'pattern': { type: 'invalid_pattern', message: 'Format invalide' }
        };

        const type = error.type || 'invalid';
        const errorData = validationErrors[type] || { type: 'validation_error', message: 'Erreur de validation' };
        
        console.warn('Erreur de validation:', error);
        throw new Error(`Validation échouée: ${errorData.message}`);
    },

    // Gestion des erreurs de transaction
    handleTransactionError(error) {
        const transactionErrors = {
            'insufficient_balance': { type: 'insufficient_balance', message: 'Solde insuffisant' },
            'invalid_address': { type: 'invalid_address', message: 'Adresse invalide' },
            'invalid_amount': { type: 'invalid_amount', message: 'Montant invalide' },
            'transaction_failed': { type: 'transaction_failed', message: 'Transaction échouée' },
            'network_error': { type: 'network_error', message: 'Erreur réseau' },
            'timeout': { type: 'timeout', message: 'Délai dépassé' }
        };

        const type = error.type || error.code || 'unknown';
        const errorData = transactionErrors[type] || { type: 'transaction_error', message: 'Erreur de transaction' };
        
        console.error('Erreur de transaction:', error);
        throw new Error(`Transaction échouée: ${errorData.message}`);
    },

    // Gestion des erreurs générales
    handleError(error, context = 'Une erreur est survenue') {
        console.error(context + ':', error);
        
        // Afficher une notification à l'utilisateur
        if (window.showNotification) {
            showNotification('Erreur', error.message || 'Une erreur est survenue', 'error');
        }
        
        // Enregistrer l'erreur dans les logs
        if (window.app && app.settings && app.settings.logging) {
            app.settings.logging.error(context, error);
        }
        
        // Propager l'erreur
        throw error;
    }
};

export default errorHandler;
