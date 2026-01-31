export interface IdempotencyRecord {
    id: string;
    key: string;
    operation: string;
    request_hash: string;
    response_data: any;
    status: 'PENDING' | 'SUCCESS' | 'FAILURE';
    created_at: Date;
    expires_at: Date;
}
export declare class IdempotencyService {
    private readonly DEFAULT_TTL_HOURS;
    /**
     * Generate a unique idempotency key if not provided
     */
    generateKey(): string;
    /**
     * Create a hash of the request for duplicate detection
     */
    private createRequestHash;
    /**
     * Normalize request data to ensure consistent hashing
     */
    private normalizeRequestData;
    /**
     * Sort object keys recursively for consistent hashing
     */
    private sortObjectKeys;
    /**
     * Check if an idempotency key already exists and return the cached response
     */
    checkIdempotency(key: string, operation: string, requestData: any): Promise<IdempotencyRecord | null>;
    /**
     * Store a new idempotency record
     */
    storeIdempotency(key: string, operation: string, requestData: any, responseData: any, status: 'PENDING' | 'SUCCESS' | 'FAILURE', ttlHours?: number): Promise<IdempotencyRecord>;
    /**
     * Update the status of an existing idempotency record
     */
    updateIdempotencyStatus(key: string, operation: string, status: 'PENDING' | 'SUCCESS' | 'FAILURE', responseData?: any): Promise<void>;
    /**
     * Clean up expired idempotency records
     */
    cleanupExpired(): Promise<number>;
    /**
     * Get idempotency record by key and operation
     */
    getIdempotencyRecord(key: string, operation: string): Promise<IdempotencyRecord | null>;
}
export declare class CleanupService {
    private cleanupInterval;
    private readonly CLEANUP_INTERVAL_MS;
    /**
     * Start the cleanup service
     */
    start(): void;
    /**
     * Stop the cleanup service
     */
    stop(): void;
    /**
     * Run cleanup of expired records
     */
    private runCleanup;
    /**
     * Clean up expired payment intents
     */
    private cleanupExpiredPaymentIntents;
    /**
     * Clean up expired transactions
     */
    private cleanupExpiredTransactions;
    /**
     * Manual cleanup trigger
     */
    manualCleanup(): Promise<{
        idempotencyKeys: number;
        paymentIntents: number;
        transactions: number;
    }>;
}
export declare const cleanupService: CleanupService;
export declare const idempotencyService: IdempotencyService;
//# sourceMappingURL=IdempotencyService.d.ts.map