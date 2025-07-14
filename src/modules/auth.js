// auth.js
import CryptoJS from 'crypto-js';
import errorHandler from './errorHandler'; // Importer errorHandler

const auth = {
    // Générer un PIN sécurisé
    generateSecurePin() {
        const digits = '0123456789';
        let pin = '';
        for (let i = 0; i < 6; i++) {
            pin += digits[Math.floor(Math.random() * digits.length)];
        }
        return pin;
    },

    // Chiffre les données avec un salt unique
    encryptData(data, password) {
        try {
            const jsonData = JSON.stringify(data);
            const encrypted = CryptoJS.AES.encrypt(jsonData, password).toString();
            
            return {
                encrypted: encrypted
            };
        } catch (error) {
            errorHandler.handleError(error, errorHandler.TYPES.ENCRYPTION);
            throw new Error('Erreur lors du chiffrement des données');
        }
    },

    // Déchiffre les données
    decryptData(encryptedData, password) {
        try {
            if (!encryptedData || !encryptedData.encrypted) {
                throw new Error("Données chiffrées invalides ou manquantes");
            }

            const decryptedBytes = CryptoJS.AES.decrypt(encryptedData.encrypted, password);
            const decryptedJsonString = decryptedBytes.toString(CryptoJS.enc.Utf8);

            if (!decryptedJsonString) {
                throw new Error("Déchiffrement échoué : Résultat vide ou invalide. Mot de passe incorrect ?");
            }

            return JSON.parse(decryptedJsonString);
        } catch (error) {
            errorHandler.handleError(error, errorHandler.TYPES.ENCRYPTION);
            throw new Error('Erreur lors du déchiffrement des données');
        }
    },

    // Générer un hash pour le PIN
    generatePinHash(pin) {
        try {
            // Utiliser CryptoJS pour le hash
            const hash = CryptoJS.SHA256(pin).toString(CryptoJS.enc.Hex);
            return hash;
        } catch (error) {
            errorHandler.handleError(error, errorHandler.TYPES.AUTH);
            throw new Error('Erreur lors du hashage du PIN');
        }
    },

    // Vérifier si le PIN est correct
    verifyPin(inputPin) {
        try {
            const storedPin = localStorage.getItem('userPin');
            if (!storedPin) {
                throw new Error('Aucun PIN n\'est configuré');
            }
            
            const storedHash = this.generatePinHash(storedPin);
            const inputHash = this.generatePinHash(inputPin);
            
            return storedHash === inputHash;
        } catch (error) {
            errorHandler.handleError(error, errorHandler.TYPES.AUTH);
            throw new Error('Erreur lors de la vérification du PIN');
        }
    },

    // Changer le PIN
    changePin(oldPin, newPin) {
        try {
            // Vérifier l'ancien PIN
            if (!this.verifyPin(oldPin)) {
                throw new Error('Ancien PIN incorrect');
            }
            
            // Valider le nouveau PIN
            if (!this.validatePin(newPin)) {
                throw new Error('Nouveau PIN invalide');
            }
            
            // Sauvegarder le nouveau PIN
            localStorage.setItem('userPin', newPin);
            return true;
        } catch (error) {
            errorHandler.handleError(error, errorHandler.TYPES.AUTH);
            throw new Error('Erreur lors du changement de PIN');
        }
    },

    // Valider un PIN
    validatePin(pin) {
        try {
            if (!pin || typeof pin !== 'string') {
                throw new Error('Le PIN doit être une chaîne de caractères');
            }
            
            if (pin.length !== 6) {
                throw new Error('Le PIN doit contenir exactement 6 chiffres');
            }
            
            if (!/^[0-9]{6}$/.test(pin)) {
                throw new Error('Le PIN doit contenir uniquement des chiffres');
            }
            
            return true;
        } catch (error) {
            errorHandler.handleError(error, errorHandler.TYPES.VALIDATION);
            throw error;
        }
    }
};

export default auth;
