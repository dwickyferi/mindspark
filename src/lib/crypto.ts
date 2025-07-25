import crypto from "crypto";

// Ensure the key is exactly 32 bytes for AES-256
// Updated to use modern crypto API
const getEncryptionKey = (): Buffer => {
  const key =
    process.env.ENCRYPTION_KEY || "defaultkey123456789012345678901234";
  if (key.length !== 32) {
    // Pad or truncate to 32 bytes
    const normalizedKey = key.padEnd(32, "0").substring(0, 32);
    return Buffer.from(normalizedKey, "utf8");
  }
  return Buffer.from(key, "utf8");
};

const ENCRYPTION_KEY = getEncryptionKey();
const ALGORITHM = "aes-256-cbc";

export function encrypt(text: string): string {
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");

    return iv.toString("hex") + ":" + encrypted;
  } catch (error) {
    console.error("Encryption error:", error);
    throw new Error("Failed to encrypt data");
  }
}

export function decrypt(encryptedText: string): string {
  try {
    const [ivHex, encrypted] = encryptedText.split(":");
    if (!ivHex || !encrypted) {
      throw new Error("Invalid encrypted text format");
    }

    const iv = Buffer.from(ivHex, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.error("Decryption error:", error);
    throw new Error("Failed to decrypt data");
  }
}
