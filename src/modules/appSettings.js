// appSettings.js
import errorHandler from './errorHandler';

const appSettings = {
    // Valeurs par défaut
    DEFAULTS: {
        theme: 'dark',
        language: 'fr',
        pinLength: 5,
        autoLock: true,
        notifications: true,
        currency: 'CHF',
        tpe: {
            acceptedCryptos: [
                { symbol: 'BTC', name: 'Bitcoin', enabled: true },
                { symbol: 'ETH', name: 'Ethereum', enabled: true },
                { symbol: 'XRP', name: 'Ripple', enabled: true },
                { symbol: 'SUI', name: 'Sui', enabled: true },
                { symbol: 'MATIC', name: 'Polygon', enabled: true },
                { symbol: 'ARB', name: 'Arbitrum', enabled: true },
                { symbol: 'USDC', name: 'USD Coin', enabled: true },
                { symbol: 'USDT', name: 'Tether', enabled: true },
                { symbol: 'CHFM', name: 'CHF Montura', enabled: true },
                { symbol: 'ALGO', name: 'Algorand', enabled: true }
            ],
            autoConvert: true,
            conversionTarget: 'CHFM',
            convertTiming: 'endOfDay',
            minAmount: 10,
            maxAmount: 10000
        }
    },

    // Charger les paramètres depuis le localStorage
    loadSettings() {
        try {
            const savedSettings = localStorage.getItem('appSettings');
            if (savedSettings) {
                return JSON.parse(savedSettings);
            }
            return this.DEFAULTS;
        } catch (error) {
            errorHandler.handleError(error, errorHandler.TYPES.SETTINGS);
            return this.DEFAULTS;
        }
    },

    // Sauvegarder les paramètres dans le localStorage
    saveSettings(settings) {
        try {
            localStorage.setItem('appSettings', JSON.stringify(settings));
            return true;
        } catch (error) {
            errorHandler.handleError(error, errorHandler.TYPES.SETTINGS);
            return false;
        }
    },

    // Appliquer le thème
    applyTheme(theme) {
        try {
            document.documentElement.setAttribute('data-theme', theme);
            return true;
        } catch (error) {
            errorHandler.handleError(error, errorHandler.TYPES.THEME);
            return false;
        }
    },

    // Appliquer la langue
    applyLanguage(lang) {
        try {
            document.documentElement.setAttribute('lang', lang);
            return true;
        } catch (error) {
            errorHandler.handleError(error, errorHandler.TYPES.LANGUAGE);
            return false;
        }
    },

    // Valider les paramètres de transaction
    validateTransactionSettings(settings) {
        try {
            if (!settings.currency || !Object.values(this.TYPES.TRANSACTION).includes(settings.currency)) {
                const error = new Error('Devise invalide');
                error.type = 'validation';
                errorHandler.handleValidationError(error, 'Validation devise');
                throw error;
            }
            if (!settings.network || !['mainnet', 'testnet'].includes(settings.network)) {
                const error = new Error('Réseau invalide');
                error.type = 'validation';
                errorHandler.handleValidationError(error, 'Validation réseau');
                throw error;
            }
            if (settings.gasLimit < 21000) {
                const error = new Error('Limites de gas trop basses');
                error.type = 'validation';
                errorHandler.handleValidationError(error, 'Validation gasLimit');
                throw error;
            }
            if (settings.gasPrice < 1000000000) {
                const error = new Error('Prix du gas trop bas');
                error.type = 'validation';
                errorHandler.handleValidationError(error, 'Validation gasPrice');
                throw error;
            }
            return true;
        } catch (error) {
            errorHandler.handleError(error, errorHandler.TYPES.VALIDATION);
            throw error;
        }
    },

    // Valider les paramètres
    validateSettings(settings) {
        try {
            // Valider la longueur du PIN
            if (settings.pinLength) {
                if (typeof settings.pinLength !== 'number' || settings.pinLength < 4 || settings.pinLength > 10) {
                    const error = new Error('La longueur du PIN doit être entre 4 et 10');
                    error.type = 'validation';
                    errorHandler.handleValidationError(error, 'Validation PIN');
                    throw error;
                }
            }

            // Valider les montants TPE
            if (settings.tpe) {
                if (settings.tpe.minAmount) {
                    validation.validateAmount(settings.tpe.minAmount, 'CHF');
                }
                if (settings.tpe.maxAmount) {
                    validation.validateAmount(settings.tpe.maxAmount, 'CHF');
                }
            }

            // Valider la devise
            if (settings.currency) {
                const validCurrencies = ['CHF', 'USD', 'EUR'];
                if (!validCurrencies.includes(settings.currency)) {
                    throw new Error('Devise invalide');
                }
            }
            
            return true;
        } catch (error) {
            console.error('Erreur de validation des paramètres:', error);
            throw error;
        }
    },

    // Application des paramètres
    applySettings(settings) {
        try {
            // Appliquer le thème
            if (settings.theme) {
                applyTheme(settings.theme);
            }
            
            // Appliquer la langue
            if (settings.language) {
                setLanguage(settings.language);
            }
            
            // Appliquer la devise
            if (settings.currency) {
                updateCurrency(settings.currency);
            }
            
            // Mettre à jour les paramètres TPE
            if (settings.tpe) {
                updateTPESettings(settings.tpe);
            }
            
            return true;
        } catch (error) {
            console.error('Erreur lors de l\'application des paramètres:', error);
            throw error;
        }
    },

    // Gestion des notifications
    toggleNotifications(enabled) {
        try {
            const settings = this.loadSettings();
            settings.notifications = enabled;
            this.saveSettings(settings);
            return true;
        } catch (error) {
            console.error('Erreur lors de la mise à jour des notifications:', error);
            throw error;
        }
    },

    // Gestion du thème
    toggleTheme(darkMode) {
        try {
            const settings = this.loadSettings();
            settings.theme = darkMode ? 'dark' : 'light';
            this.saveSettings(settings);
            return true;
        } catch (error) {
            console.error('Erreur lors de la mise à jour du thème:', error);
            throw error;
        }
    },

    // Gestion de la langue
    setLanguage(lang) {
        try {
            const settings = this.loadSettings();
            settings.language = lang;
            this.saveSettings(settings);
            return true;
        } catch (error) {
            console.error('Erreur lors de la mise à jour de la langue:', error);
            throw error;
        }
    },

    // Gestion de la devise
    setCurrency(currency) {
        try {
            const settings = this.loadSettings();
            settings.currency = currency;
            this.saveSettings(settings);
            return true;
        } catch (error) {
            console.error('Erreur lors de la mise à jour de la devise:', error);
            throw error;
        }
    }
};

export default appSettings;
