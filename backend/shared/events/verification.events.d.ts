export interface ProfileCompletionEvent {
    userId: string;
    profileCompleted: boolean;
    completionPercentage: number;
    timestamp: Date;
}
export interface DocumentCompletionEvent {
    userId: string;
    allDocumentsCompleted: boolean;
    completedDocuments: string[];
    requiredDocuments: string[];
    timestamp: Date;
}
export interface VerificationStatusEvent {
    userId: string;
    oldStatus: 'not_verified' | 'pending' | 'verified' | 'rejected';
    newStatus: 'not_verified' | 'pending' | 'verified' | 'rejected';
    reason: 'profile_complete' | 'documents_complete' | 'both_complete' | 'manual' | 'admin_action';
    timestamp: Date;
}
export declare class VerificationEventEmitter {
    private static instance;
    private listeners;
    private constructor();
    static getInstance(): VerificationEventEmitter;
    on(event: string, callback: Function): void;
    emit(event: string, data: any): void;
    off(event: string, callback?: Function): void;
}
export declare const verificationEvents: VerificationEventEmitter;
//# sourceMappingURL=verification.events.d.ts.map