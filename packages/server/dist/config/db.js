"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.disconnect = exports.getConnectionInfo = exports.isConnected = exports.connectDB = void 0;
/**
 * @fileoverview Enterprise-Grade Database Configuration (TypeScript)
 * Robust MongoDB connection management with retry logic and environment-aware configs.
 */
const mongoose_1 = __importDefault(require("mongoose"));
require('dotenv').config();
mongoose_1.default.set('strictQuery', true);
if (process.env.MONGOOSE_DEBUG === 'true') {
    mongoose_1.default.set('debug', true);
}
const NODE_ENV = process.env.NODE_ENV || 'development';
const CONNECTION_CONFIGS = {
    development: {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        maxPoolSize: 5,
        minPoolSize: 1,
        family: 4,
        autoIndex: true,
        connectTimeoutMS: 10000,
        maxIdleTimeMS: 30000,
        retryWrites: true,
        retryReads: true,
        dbName: process.env.MONGO_DB || 'dam_dev',
    },
    test: {
        serverSelectionTimeoutMS: 2000,
        socketTimeoutMS: 10000,
        maxPoolSize: 2,
        minPoolSize: 1,
        family: 4,
        autoIndex: true,
        connectTimeoutMS: 5000,
        maxIdleTimeMS: 10000,
        retryWrites: false,
        retryReads: false,
        dbName: process.env.MONGO_DB || 'dam_test',
    },
    production: {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 60000,
        maxPoolSize: 15,
        minPoolSize: 3,
        family: 4,
        autoIndex: false,
        connectTimeoutMS: 15000,
        maxIdleTimeMS: 60000,
        retryWrites: true,
        retryReads: true,
        heartbeatFrequencyMS: 10000,
        dbName: process.env.MONGO_DB || 'dam_prod',
    },
};
const getConnectionOptions = () => {
    const config = CONNECTION_CONFIGS[NODE_ENV] || CONNECTION_CONFIGS.development;
    return { ...config };
};
const RETRY_CONFIG = {
    maxRetries: 5,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2,
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const getRetryDelay = (attempt) => {
    const delay = RETRY_CONFIG.baseDelay * Math.pow(RETRY_CONFIG.backoffFactor, attempt - 1);
    return Math.min(delay, RETRY_CONFIG.maxDelay);
};
const connectDB = async () => {
    const mongoURI = process.env.MONGO_URI;
    if (!mongoURI) {
        const error = new Error('MONGO_URI environment variable is required');
        error.code = 'MISSING_MONGO_URI';
        throw error;
    }
    const connectionOptions = getConnectionOptions();
    let lastError = null;
    for (let attempt = 1; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
        try {
            console.log(`⏳ Connecting to MongoDB... (Attempt ${attempt}/${RETRY_CONFIG.maxRetries})`);
            console.log(`🔧 Environment: ${NODE_ENV}`);
            await mongoose_1.default.connect(mongoURI, connectionOptions);
            console.log('✅ MongoDB connection established successfully');
            console.log(`📊 Connection Pool: ${connectionOptions.minPoolSize}-${connectionOptions.maxPoolSize}`);
            console.log(`⚡ Database: ${mongoose_1.default.connection.name || 'Unknown'}`);
            return mongoose_1.default.connection;
        }
        catch (error) {
            lastError = error;
            console.error(`❌ Connection attempt ${attempt} failed: ${error.message}`);
            if (error.message?.includes('authentication failed') ||
                error.message?.includes('bad auth') ||
                error.message?.includes('Authentication failed')) {
                console.error('🚫 Authentication error - not retrying');
                throw error;
            }
            if (attempt === RETRY_CONFIG.maxRetries) {
                console.error(`💥 All ${RETRY_CONFIG.maxRetries} connection attempts failed`);
                throw error;
            }
            const delay = getRetryDelay(attempt);
            console.log(`⏱️  Retrying in ${delay}ms...`);
            await sleep(delay);
        }
    }
    throw lastError || new Error('Connection failed after all retry attempts');
};
exports.connectDB = connectDB;
const isConnected = () => {
    return mongoose_1.default.connection.readyState === 1;
};
exports.isConnected = isConnected;
const getConnectionInfo = () => {
    const states = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting',
    };
    return {
        state: states[mongoose_1.default.connection.readyState] || 'unknown',
        readyState: mongoose_1.default.connection.readyState,
        host: mongoose_1.default.connection.host,
        port: mongoose_1.default.connection.port,
        name: mongoose_1.default.connection.name,
        collections: Object.keys(mongoose_1.default.connection.collections),
    };
};
exports.getConnectionInfo = getConnectionInfo;
const disconnect = async () => {
    if (mongoose_1.default.connection.readyState !== 0) {
        console.log('🔌 Closing MongoDB connection...');
        await mongoose_1.default.connection.close();
        console.log('✅ MongoDB connection closed gracefully');
    }
};
exports.disconnect = disconnect;
