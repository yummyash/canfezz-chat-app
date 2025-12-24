const CryptoJS = require('crypto-js');

class EncryptionService {
  static encryptMessage(message, key) {
    try {
      const iv = CryptoJS.lib.WordArray.random(16);
      const encrypted = CryptoJS.AES.encrypt(
        JSON.stringify(message),
        key,
        { iv: iv }
      );
      
      return {
        encrypted: encrypted.toString(),
        iv: iv.toString(CryptoJS.enc.Hex)
      };
    } catch (error) {
      throw new Error('Encryption failed: ' + error.message);
    }
  }

  static decryptMessage(encryptedData, iv, key) {
    try {
      const decrypted = CryptoJS.AES.decrypt(
        encryptedData,
        key,
        { iv: CryptoJS.enc.Hex.parse(iv) }
      );
      
      const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
      if (!decryptedText) {
        throw new Error('Decryption failed - empty result');
      }
      
      return JSON.parse(decryptedText);
    } catch (error) {
      throw new Error('Decryption failed: ' + error.message);
    }
  }

  static generateKey() {
    return CryptoJS.lib.WordArray.random(32).toString();
  }

  static hashData(data) {
    return CryptoJS.SHA256(JSON.stringify(data)).toString();
  }
}

module.exports = EncryptionService;