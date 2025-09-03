"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisUtils = exports.getRedisClient = exports.getRedisService = exports.RedisService = void 0;
/**
 * @fileoverview Redis Configuration - BullMQ Queue Management
 * Redis client setup for BullMQ job queue processing with proper connection management.
 * Provides singleton Redis connection for queue workers and job management.
 */
const ioredis_1 = __importDefault(require("ioredis"));
require('dotenv').config();
/**
 * Redis connection wrapper class
 * Provides connection management and health checking
 */
class RedisService {
    redis;
    config;
    isConnected = false;
    /**
     * Initialize Redis service
     * @param config - Redis configuration
     */
    constructor(config) {
        this.config = config;
        this.redis = new ioredis_1.default({
            host: config.host,
            port: config.port,
            password: config.password,
            db: config.db || 0,
            keyPrefix: config.keyPrefix,
            maxRetriesPerRequest: config.maxRetriesPerRequest,
            connectTimeout: config.connectTimeout,
            lazyConnect: config.lazyConnect,
            // ioredis retry strategy in milliseconds
            retryStrategy: (times) => {
                // backoff: 100ms, 200ms, 300ms ... capped at 2000ms
                const delay = Math.min(100 * times, 2000);
                return delay;
            },
        });
        this.setupEventHandlers();
    }
    /**
     * Setup Redis event handlers for connection monitoring
     */
    setupEventHandlers() {
        this.redis.on('connect', () => {
            console.log('✅ Redis connected successfully');
            this.isConnected = true;
        });
        this.redis.on('ready', () => {
            console.log('🚀 Redis client ready for commands');
        });
        this.redis.on('error', (error) => {
            console.error('❌ Redis connection error:', error.message);
            this.isConnected = false;
        });
        this.redis.on('close', () => {
            console.log('🔌 Redis connection closed');
            this.isConnected = false;
        });
        this.redis.on('reconnecting', (ms) => {
            console.log(`⏳ Redis reconnecting in ${ms}ms`);
        });
    }
    /**
     * Get Redis client instance
     * @returns Redis client
     */
    getClient() {
        return this.redis;
    }
    /**
     * Check if Redis is connected
     * @returns Connection status
     */
    isConnectedToRedis() {
        return this.isConnected && this.redis.status === 'ready';
    }
    /**
     * Test Redis connection with ping
     * @returns Promise resolving to ping success
     */
    async ping() {
        try {
            const result = await this.redis.ping();
            return result === 'PONG';
        }
        catch (error) {
            console.error('Redis ping failed:', error);
            return false;
        }
    }
    /**
     * Get Redis connection info
     * @returns Connection information
     */
    getConnectionInfo() {
        return {
            host: this.config.host,
            port: this.config.port,
            db: this.config.db || 0,
            status: this.redis.status,
            uptime: this.isConnected ? Date.now() : undefined
        };
    }
    /**
     * Gracefully disconnect from Redis
     */
    async disconnect() {
        if (this.redis.status !== 'end') {
            console.log('🔌 Disconnecting from Redis...');
            await this.redis.quit();
            console.log('✅ Redis disconnected gracefully');
        }
    }
    /**
     * Get memory usage stats
     * @returns Redis memory information
     */
    async getMemoryInfo() {
        try {
            const info = await this.redis.info('memory');
            const lines = info.split('\r\n');
            const memInfo = {};
            lines.forEach(line => {
                const [key, value] = line.split(':');
                if (key && value) {
                    memInfo[key] = value;
                }
            });
            return {
                used: memInfo.used_memory_human || 'Unknown',
                peak: memInfo.used_memory_peak_human || 'Unknown',
                total: memInfo.total_system_memory_human || 'Unknown',
                available: memInfo.available_memory || 'Unknown'
            };
        }
        catch (error) {
            console.error('Failed to get Redis memory info:', error);
            return null;
        }
    }
}
exports.RedisService = RedisService;
/**
 * Environment variable validation and parsing for Redis configuration
 */
const getRedisConfig = () => {
    const host = process.env.REDIS_HOST || 'localhost';
    const port = parseInt(process.env.REDIS_PORT || '6379', 10);
    const password = process.env.REDIS_PASSWORD;
    const db = parseInt(process.env.REDIS_DB || '0', 10);
    if (isNaN(port)) {
        throw new Error('Invalid REDIS_PORT: must be a number');
    }
    if (isNaN(db)) {
        throw new Error('Invalid REDIS_DB: must be a number');
    }
    const config = {
        host,
        port,
        password,
        db,
        keyPrefix: process.env.REDIS_KEY_PREFIX || 'dam:',
        maxRetriesPerRequest: 3,
        connectTimeout: 10000,
        lazyConnect: true
    };
    return config;
};
/**
 * Global Redis service instance
 * Singleton pattern for reusing Redis connection across the application
 */
let redisServiceInstance = null;
/**
 * Get or create Redis service instance
 * @returns RedisService singleton instance
 */
const getRedisService = () => {
    if (!redisServiceInstance) {
        const config = getRedisConfig();
        redisServiceInstance = new RedisService(config);
    }
    return redisServiceInstance;
};
exports.getRedisService = getRedisService;
/**
 * Get Redis client directly (convenience function)
 * @returns Redis client instance
 */
const getRedisClient = () => {
    return (0, exports.getRedisService)().getClient();
};
exports.getRedisClient = getRedisClient;
/**
 * Redis utility functions for common operations
 */
exports.RedisUtils = {
    /**
     * Generate cache key with prefix
     * @param parts - Key parts to join
     * @returns Formatted cache key
     */
    cacheKey: (...parts) => {
        const prefix = process.env.REDIS_KEY_PREFIX || 'dam:';
        return prefix + parts.join(':');
    },
    /**
     * Set data with expiration
     * @param redis - Redis client
     * @param key - Cache key
     * @param value - Data to cache
     * @param ttlSeconds - Time to live in seconds
     */
    setWithTTL: async (redis, key, value, ttlSeconds) => {
        const serialized = typeof value === 'string' ? value : JSON.stringify(value);
        await redis.setex(key, ttlSeconds, serialized);
    },
    /**
     * Get and parse cached data
     * @param redis - Redis client
     * @param key - Cache key
     * @returns Parsed data or null if not found
     */
    getAndParse: async (redis, key) => {
        const data = await redis.get(key);
        if (!data)
            return null;
        try {
            return JSON.parse(data);
        }
        catch {
            return data; // Return as string if not JSON
        }
    },
    /**
     * Delete multiple keys by pattern
     * @param redis - Redis client
     * @param pattern - Pattern to match (e.g., "user:*")
     * @returns Number of deleted keys
     */
    deleteByPattern: async (redis, pattern) => {
        const keys = await redis.keys(pattern);
        if (keys.length === 0)
            return 0;
        await redis.del(...keys);
        return keys.length;
    },
    /**
     * Increment counter with expiration
     * @param redis - Redis client
     * @param key - Counter key
     * @param ttlSeconds - Expiration time in seconds
     * @returns New counter value
     */
    incrementCounter: async (redis, key, ttlSeconds) => {
        const multi = redis.multi();
        multi.incr(key);
        multi.expire(key, ttlSeconds);
        const results = await multi.exec();
        return results?.[0]?.[1] || 0;
    }
};
exports.default = RedisService;
