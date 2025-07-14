// validation.js

const validation = {
    // Validation de montants
    validateAmount(amount, currency, balance = 0) {
        try {
            if (typeof amount !== 'number' || isNaN(amount)) {
                throw new Error('Le montant doit être un nombre valide');
            }
            if (amount <= 0) {
                throw new Error('Le montant doit être supérieur à zéro');
            }
            if (amount > balance) {
                throw new Error('Solde insuffisant');
            }
            
            // Restrictions par devise
            const currencyLimits = {
                BTC: { min: 0.0001, max: 10, decimals: 8 },
                ETH: { min: 0.001, max: 100, decimals: 18 },
                USDC: { min: 1, max: 10000, decimals: 6 },
                CHF: { min: 1, max: 100000, decimals: 2 },
                USDT: { min: 1, max: 10000, decimals: 6 },
                MATIC: { min: 0.001, max: 1000, decimals: 18 },
                SUI: { min: 0.001, max: 1000, decimals: 9 },
                ALGO: { min: 0.001, max: 1000, decimals: 6 },
                XRP: { min: 0.001, max: 1000, decimals: 6 },
                BNB: { min: 0.001, max: 1000, decimals: 18 },
                ADA: { min: 1, max: 1000000, decimals: 6 },
                DOT: { min: 0.001, max: 1000, decimals: 10 },
                LINK: { min: 0.001, max: 1000, decimals: 18 }
            };
            
            const limits = currencyLimits[currency] || { min: 0, max: Infinity, decimals: 2 };
            if (amount < limits.min) {
                throw new Error(`Montant minimum pour ${currency}: ${limits.min}`);
            }
            if (amount > limits.max) {
                throw new Error(`Montant maximum pour ${currency}: ${limits.max}`);
            }
            
            // Vérifier le nombre de décimales
            const amountStr = amount.toString();
            const decimalIndex = amountStr.indexOf('.');
            if (decimalIndex !== -1) {
                const decimals = amountStr.length - decimalIndex - 1;
                if (decimals > limits.decimals) {
                    throw new Error(`Trop de décimales pour ${currency} (max ${limits.decimals})`);
                }
            }
            
            return true;
        } catch (error) {
            console.error(`Erreur de validation du montant pour ${currency}:`, error);
            throw error;
        }
    },

    // Validation d'adresses
    validateAddress(address, currency) {
        try {
            const networks = {
                BTC: bitcoin.networks.bitcoin,
                ETH: ethers,
                USDC: ethers,
                USDT: ethers,
                MATIC: ethers,
                SUI: ethers,
                ALGO: ethers,
                XRP: ethers,
                BNB: ethers,
                ADA: ethers,
                DOT: ethers,
                LINK: ethers
            };
            
            const network = networks[currency];
            if (!network) {
                throw new Error('Devise non supportée');
            }

            switch (currency) {
                case 'BTC':
                    try {
                        bitcoin.address.fromBase58Check(address);
                    } catch {
                        throw new Error('Adresse Bitcoin invalide');
                    }
                    break;
                case 'ETH':
                case 'USDC':
                case 'USDT':
                case 'MATIC':
                case 'SUI':
                case 'ALGO':
                case 'XRP':
                case 'BNB':
                case 'ADA':
                case 'DOT':
                case 'LINK':
                    if (!ethers.isAddress(address)) {
                        throw new Error('Adresse Ethereum invalide');
                    }
                    break;
                default:
                    throw new Error('Devise non supportée');
            }
            
            return true;
        } catch (error) {
            console.error('Erreur de validation:', error);
            throw error;
        }
    },

    // Validation de PIN
    validatePin(pin, requiredLength = 4) {
        try {
            if (!pin) {
                throw new Error('Le PIN est requis');
            }
            if (typeof pin !== 'string') {
                throw new Error('Le PIN doit être une chaîne de caractères');
            }
            if (pin.length !== requiredLength) {
                throw new Error(`Le PIN doit contenir exactement ${requiredLength} chiffres`);
            }
            if (!/^[0-9]+$/.test(pin)) {
                throw new Error('Le PIN ne doit contenir que des chiffres');
            }
            return true;
        } catch (error) {
            console.error('Erreur de validation du PIN:', error);
            throw error;
        }
    },

    // Validation de numéro de téléphone
    validatePhoneNumber(phoneNumber) {
        try {
            if (!phoneNumber) {
                throw new Error('Le numéro de téléphone est requis');
            }
            if (typeof phoneNumber !== 'string') {
                throw new Error('Le numéro de téléphone doit être une chaîne de caractères');
            }
            if (!/^\+?[0-9]{10,15}$/.test(phoneNumber)) {
                throw new Error('Format de numéro de téléphone invalide');
            }
            return true;
        } catch (error) {
            console.error('Erreur de validation du numéro de téléphone:', error);
            throw error;
        }
    },

    // Validation d'email
    validateEmail(email) {
        try {
            if (!email) {
                throw new Error('L\'email est requis');
            }
            if (typeof email !== 'string') {
                throw new Error('L\'email doit être une chaîne de caractères');
            }
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                throw new Error('Format d\'email invalide');
            }
            return true;
        } catch (error) {
            console.error('Erreur de validation de l\'email:', error);
            throw error;
        }
    },

    // Validation de date
    validateDate(dateString) {
        try {
            if (!dateString) {
                throw new Error('La date est requise');
            }
            if (typeof dateString !== 'string') {
                throw new Error('La date doit être une chaîne de caractères');
            }
            const date = new Date(dateString);
            if (isNaN(date.getTime())) {
                throw new Error('Format de date invalide');
            }
            return true;
        } catch (error) {
            console.error('Erreur de validation de la date:', error);
            throw error;
        }
    }
};

export default validation;
