/**
 * @fileoverview Enterprise-Grade Database Configuration (TypeScript)
 * Robust MongoDB connection management with retry logic and environment-aware configs.
 */
import mongoose, { ConnectOptions } from 'mongoose';
require('dotenv').config();

mongoose.set('strictQuery', true);
if (process.env.MONGOOSE_DEBUG === 'true') {
    mongoose.set('debug', true);
}

const NODE_ENV: string = process.env.NODE_ENV || 'development';

type ConnectionPreset = ConnectOptions & { dbName?: string };

const CONNECTION_CONFIGS: Record<string, ConnectionPreset> = {
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

const getConnectionOptions = (): ConnectionPreset => {
    const config = CONNECTION_CONFIGS[NODE_ENV] || CONNECTION_CONFIGS.development;
    return { ...config };
};

const RETRY_CONFIG = {
    maxRetries: 5,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2,
};

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const getRetryDelay = (attempt: number): number => {
    const delay = RETRY_CONFIG.baseDelay * Math.pow(RETRY_CONFIG.backoffFactor, attempt - 1);
    return Math.min(delay, RETRY_CONFIG.maxDelay);
};

export const connectDB = async (): Promise<typeof mongoose.connection> => {
    const mongoURI = process.env.MONGO_URI;
    if (!mongoURI) {
        const error: any = new Error('MONGO_URI environment variable is required');
        error.code = 'MISSING_MONGO_URI';
        throw error;
    }

    const connectionOptions = getConnectionOptions();
    let lastError: any = null;

    for (let attempt = 1; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
        try {
            console.log(
                `⏳ Connecting to MongoDB... (Attempt ${attempt}/${RETRY_CONFIG.maxRetries})`,
            );
            console.log(`🔧 Environment: ${NODE_ENV}`);
            await mongoose.connect(mongoURI, connectionOptions);
            console.log('✅ MongoDB connection established successfully');
            console.log(
                `📊 Connection Pool: ${connectionOptions.minPoolSize}-${connectionOptions.maxPoolSize}`,
            );
            console.log(`⚡ Database: ${mongoose.connection.name || 'Unknown'}`);
            return mongoose.connection;
        } catch (error: any) {
            lastError = error;
            console.error(`❌ Connection attempt ${attempt} failed: ${error.message}`);

            if (
                error.message?.includes('authentication failed') ||
                error.message?.includes('bad auth') ||
                error.message?.includes('Authentication failed')
            ) {
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

export const isConnected = (): boolean => {
    return mongoose.connection.readyState === 1;
};

export const getConnectionInfo = () => {
    const states: Record<number, string> = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting',
    };
    return {
        state: states[mongoose.connection.readyState] || 'unknown',
        readyState: mongoose.connection.readyState,
        host: (mongoose.connection as any).host,
        port: (mongoose.connection as any).port,
        name: mongoose.connection.name,
        collections: Object.keys(mongoose.connection.collections),
    };
};

export const disconnect = async (): Promise<void> => {
    if (mongoose.connection.readyState !== 0) {
        console.log('🔌 Closing MongoDB connection...');
        await mongoose.connection.close();
        console.log('✅ MongoDB connection closed gracefully');
    }
};
