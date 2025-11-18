// import { sql } from "../db/client";
import { nanoid } from "nanoid";
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();


export interface IdempotencyRecord {
  id: string;
  key: string;
  operation: string;
  request_hash: string;
  response_data: any;
  status:   'PENDING'| 'SUCCESS' |'FAILURE';
  created_at: Date;
  expires_at: Date;
}

export class IdempotencyService {
  private readonly DEFAULT_TTL_HOURS = 24; // 24 hours default TTL

  /**
   * Generate a unique idempotency key if not provided
   */
  generateKey(): string {
    return nanoid(32);
  }

  /**
   * Create a hash of the request for duplicate detection
   */
  private createRequestHash(operation: string, data: any): string {
    const normalizedData = this.normalizeRequestData(data);
    const hashInput = `${operation}:${JSON.stringify(normalizedData)}`;
    return Buffer.from(hashInput).toString('base64');
  }

  /**
   * Normalize request data to ensure consistent hashing
   */
  private normalizeRequestData(data: any): any {
    const normalized = { ...data };
    
    // Remove fields that shouldn't affect idempotency
    delete normalized.idempotencyKey;
    delete normalized.timestamp;
    delete normalized.nonce;
    
    // Sort object keys for consistent hashing
    return this.sortObjectKeys(normalized);
  }

  /**
   * Sort object keys recursively for consistent hashing
   */
  private sortObjectKeys(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sortObjectKeys(item));
    }

    const sorted: any = {};
    Object.keys(obj).sort().forEach(key => {
      sorted[key] = this.sortObjectKeys(obj[key]);
    });

    return sorted;
  }

  /**
   * Check if an idempotency key already exists and return the cached response
   */
  async checkIdempotency(
  key: string,
  operation: string,
  requestData: any
): Promise<IdempotencyRecord | null> {
  const requestHash = this.createRequestHash(operation, requestData);

  const record = await prisma.idempotencyKey.findFirst({
    where: {
      key,
      operation,
      expiresAt: { gt: new Date() }
    },
    orderBy: { createdAt: 'desc' }
  });

  if (!record) return null;

  // Ensure the request matches the previous request for this key
  if (record.requestHash !== requestHash) {
    throw new Error(
      `Idempotency key '${key}' already exists for a different request`
    );
  }

  return {
    id: record.id,
    key: record.key,
    operation: record.operation,
    request_hash: record.requestHash,
    response_data: record.responseData,
    status: record.status,
    created_at: record.createdAt,
    expires_at: record.expiresAt
  };
}


  /**
   * Store a new idempotency record
   */
async storeIdempotency(
  key: string,
  operation: string,
  requestData: any,
  responseData: any,
  status: 'PENDING'| 'SUCCESS' |'FAILURE',
  ttlHours?: number
): Promise<IdempotencyRecord> {
  const requestHash = this.createRequestHash(operation, requestData);
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + (ttlHours ?? this.DEFAULT_TTL_HOURS));

  const record = await prisma.idempotencyKey.create({
    data: {
      key,
      operation,
      requestHash: requestHash,
      responseData: JSON.stringify(responseData),
      status,
      expiresAt: expiresAt
    }
  });

  return {
    id: record.id,
    key,
    operation,
    request_hash: requestHash,
    response_data: responseData,
    status,
    created_at: record.createdAt,
    expires_at: record.expiresAt
  };
}


  /**
   * Update the status of an existing idempotency record
   */
async updateIdempotencyStatus(
  key: string,
  operation: string,
  status: 'PENDING'| 'SUCCESS' |'FAILURE',
  responseData?: any
): Promise<void> {
  await prisma.idempotencyKey.updateMany({
    where: { key, operation },
    data: {
      status,
      responseData: responseData ? responseData : undefined,
      updatedAt: new Date(),
    },
  });
}


  /**
   * Clean up expired idempotency records
   */
async cleanupExpired(): Promise<number> {
  const result = await prisma.idempotencyKey.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });

  return result.count;
}


  /**
   * Get idempotency record by key and operation
   */
async getIdempotencyRecord(
  key: string,
  operation: string
): Promise<IdempotencyRecord | null> {
  const record = await prisma.idempotencyKey.findFirst({
    where: { key, operation },
    orderBy: { createdAt: "desc" },
  });

  if (!record) return null;

  return {
    id: record.id,
    key: record.key,
    operation: record.operation,
   request_hash: record.requestHash,
    response_data: record.responseData,
    status: record.status,
    created_at: record.createdAt,
    expires_at: record.expiresAt
  };
}
}


export class CleanupService {
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

  /**
   * Start the cleanup service
   */
  start(): void {
    if (this.cleanupInterval) {
      console.log('Cleanup service is already running');
      return;
    }

    console.log('Starting cleanup service...');
    
    // Run cleanup immediately
    this.runCleanup();

    // Schedule periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.runCleanup();
    }, this.CLEANUP_INTERVAL_MS);

    console.log('Cleanup service started');
  }

  /**
   * Stop the cleanup service
   */
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('Cleanup service stopped');
    }
  }

  /**
   * Run cleanup of expired records
   */
  private async runCleanup(): Promise<void> {
    try {
      console.log('Running cleanup of expired records...');
      
      // Clean up expired idempotency keys
      const expiredIdempotencyKeys = await idempotencyService.cleanupExpired();
      console.log(`Cleaned up ${expiredIdempotencyKeys} expired idempotency keys`);

      // Clean up old failed payment intents (older than 7 days)
      const expiredPaymentIntents = await this.cleanupExpiredPaymentIntents();
      console.log(`Cleaned up ${expiredPaymentIntents} expired payment intents`);

      // Clean up old transactions (older than 30 days)
      const expiredTransactions = await this.cleanupExpiredTransactions();
      console.log(`Cleaned up ${expiredTransactions} expired transactions`);

      console.log('Cleanup completed successfully');
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  /**
   * Clean up expired payment intents
   */
private async cleanupExpiredPaymentIntents(): Promise<number> {
  const result = await prisma.paymentIntent.deleteMany({
    where: {
      status: { in: ['FAILED', 'CANCELLED'] },
      createdAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // 7 days ago
    }
  });

  return result.count;
}


  /**
   * Clean up expired transactions
   */
private async cleanupExpiredTransactions(): Promise<number> {
  const result = await prisma.paymentTransaction.deleteMany({
    where: {
      status: 'FAILED',
      createdAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // 30 days ago
    }
  });

  return result.count;
}


  /**
   * Manual cleanup trigger
   */
  async manualCleanup(): Promise<{
    idempotencyKeys: number;
    paymentIntents: number;
    transactions: number;
  }> {
    console.log('Running manual cleanup...');
    
    const idempotencyKeys = await idempotencyService.cleanupExpired();
    const paymentIntents = await this.cleanupExpiredPaymentIntents();
    const transactions = await this.cleanupExpiredTransactions();

    const result = {
      idempotencyKeys,
      paymentIntents,
      transactions,
    };

    console.log('Manual cleanup completed:', result);
    return result;
  }
}

export const cleanupService = new CleanupService();


export const idempotencyService = new IdempotencyService();
