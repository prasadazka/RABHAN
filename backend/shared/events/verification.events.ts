/**
 * Verification Events System
 * Event-driven architecture for automatic verification status updates
 */

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

export class VerificationEventEmitter {
  private static instance: VerificationEventEmitter;
  private listeners: Map<string, Function[]> = new Map();

  private constructor() {}

  public static getInstance(): VerificationEventEmitter {
    if (!VerificationEventEmitter.instance) {
      VerificationEventEmitter.instance = new VerificationEventEmitter();
    }
    return VerificationEventEmitter.instance;
  }

  public on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  public emit(event: string, data: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  public off(event: string, callback?: Function): void {
    if (!callback) {
      this.listeners.delete(event);
      return;
    }

    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }
}

export const verificationEvents = VerificationEventEmitter.getInstance();