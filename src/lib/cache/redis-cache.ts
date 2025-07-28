import { createClient, RedisClientType } from "redis";
import { Cache } from "./cache.interface";

export class RedisCache implements Cache {
  private client: RedisClientType;
  private isConnected = false;

  constructor() {
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    this.client = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 500),
      },
    });

    this.client.on("error", (err) => {
      console.error("Redis connection error:", err);
    });

    this.client.on("connect", () => {
      console.log("Connected to Redis");
      this.isConnected = true;
    });

    this.client.on("disconnect", () => {
      console.log("Disconnected from Redis");
      this.isConnected = false;
    });

    // Connect immediately
    this.connect();
  }

  private async connect(): Promise<void> {
    if (!this.isConnected) {
      try {
        await this.client.connect();
      } catch (error) {
        console.error("Failed to connect to Redis:", error);
        throw error;
      }
    }
  }

  private async ensureConnection(): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }
  }

  async get<T>(key: string): Promise<T | undefined> {
    try {
      await this.ensureConnection();
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : undefined;
    } catch (error) {
      console.error(`Redis get error for key ${key}:`, error);
      return undefined;
    }
  }

  async set(key: string, value: unknown, ttlMs?: number): Promise<void> {
    try {
      await this.ensureConnection();
      const serializedValue = JSON.stringify(value);

      if (ttlMs) {
        await this.client.setEx(key, Math.ceil(ttlMs / 1000), serializedValue);
      } else {
        await this.client.set(key, serializedValue);
      }
    } catch (error) {
      console.error(`Redis set error for key ${key}:`, error);
      throw error;
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      await this.ensureConnection();
      const exists = await this.client.exists(key);
      return exists === 1;
    } catch (error) {
      console.error(`Redis has error for key ${key}:`, error);
      return false;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.ensureConnection();
      await this.client.del(key);
    } catch (error) {
      console.error(`Redis delete error for key ${key}:`, error);
      throw error;
    }
  }

  async clear(): Promise<void> {
    try {
      await this.ensureConnection();
      await this.client.flushDb();
    } catch (error) {
      console.error("Redis clear error:", error);
      throw error;
    }
  }

  async getAll(): Promise<Map<string, unknown>> {
    try {
      await this.ensureConnection();
      const keys = await this.client.keys("*");
      const result = new Map<string, unknown>();

      for (const key of keys) {
        const value = await this.get(key);
        if (value !== undefined) {
          result.set(key, value);
        }
      }

      return result;
    } catch (error) {
      console.error("Redis getAll error:", error);
      return new Map();
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.client.disconnect();
    } catch (error) {
      console.error("Redis disconnect error:", error);
    }
  }
}
