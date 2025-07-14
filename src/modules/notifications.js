// notifications.js

const notifications = {
    // Types de notifications
    TYPES: {
        SUCCESS: 'success',
        ERROR: 'error',
        INFO: 'info',
        WARNING: 'warning',
        CUSTOM: 'custom'
    },

    // Icônes par défaut
    ICONS: {
        success: '✅',
        error: '❌',
        info: 'ℹ️',
        warning: '⚠️',
        custom: ''
    },

    // Options par défaut
    DEFAULT_OPTIONS: {
        duration: 5000,
        position: 'top-right',
        maxNotifications: 5,
        closeable: true,
        icon: ''
    },

    // Initialisation du conteneur
    init() {
        if (!document.getElementById('notificationContainer')) {
            const container = document.createElement('div');
            container.id = 'notificationContainer';
            container.className = 'notification-container';
            document.body.appendChild(container);
        }
    },

    // Créer une notification
    createNotification(title, message, type = this.TYPES.INFO, options = {}) {
        try {
            // Valider les entrées
            if (!title || !message) {
                throw new Error('Titre et message sont requis');
            }

            // Fusionner les options
            const finalOptions = {
                ...this.DEFAULT_OPTIONS,
                ...options
            };

            // Définir l'icône
            let icon = this.ICONS[type] || this.ICONS.info;
            if (finalOptions.icon) {
                icon = finalOptions.icon;
            }

            // Créer l'élément de notification
            const notification = document.createElement('div');
            notification.className = `notification ${type}`;
            
            // Ajouter le contenu
            notification.innerHTML = `
                <div class="notification-icon">${icon}</div>
                <div class="notification-content">
                    <div class="notification-title">${title}</div>
                    <div class="notification-message">${message}</div>
                </div>
                ${finalOptions.closeable ? '<div class="notification-close">✕</div>' : ''}
            `;

            // Ajouter les événements
            if (finalOptions.closeable) {
                notification.querySelector('.notification-close').addEventListener('click', () => {
                    this.removeNotification(notification);
                });
            }

            // Ajouter l'animation
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(-100%)';

            // Ajouter au conteneur
            const container = document.getElementById('notificationContainer');
            if (container) {
                container.appendChild(notification);
                
                // Appliquer l'animation
                setTimeout(() => {
                    notification.style.opacity = '1';
                    notification.style.transform = 'translateX(0)';
                }, 10);

                // Gérer la durée
                if (finalOptions.duration > 0) {
                    setTimeout(() => {
                        this.removeNotification(notification);
                    }, finalOptions.duration);
                }
            }

            return notification;
        } catch (error) {
            console.error('Erreur lors de la création de la notification:', error);
            throw error;
        }
    },

    // Supprimer une notification
    removeNotification(notification) {
        if (!notification) return;

        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        
        setTimeout(() => {
            notification.remove();
        }, 300);
    },

    // Méthodes de raccourci
    success(title, message, options) {
        return this.createNotification(title, message, this.TYPES.SUCCESS, options);
    },

    error(title, message, options) {
        return this.createNotification(title, message, this.TYPES.ERROR, options);
    },

    info(title, message, options) {
        return this.createNotification(title, message, this.TYPES.INFO, options);
    },

    warning(title, message, options) {
        return this.createNotification(title, message, this.TYPES.WARNING, options);
    },

    custom(title, message, options) {
        return this.createNotification(title, message, this.TYPES.CUSTOM, options);
    }
};

export default notifications;
