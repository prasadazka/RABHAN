/**
 * Verification Manager Service
 * Centralized service to handle verification status updates based on events
 */
export declare class VerificationManagerService {
    private static instance;
    private userDbPool;
    private docDbPool;
    private constructor();
    static getInstance(): VerificationManagerService;
    private setupEventListeners;
    private handleProfileCompletion;
    private handleDocumentCompletion;
    private checkAndUpdateVerificationStatus;
    private updateVerificationStatus;
    triggerVerificationCheck(userId: string): Promise<void>;
    cleanup(): Promise<void>;
}
export declare const verificationManager: VerificationManagerService;
//# sourceMappingURL=verification-manager.service.d.ts.map