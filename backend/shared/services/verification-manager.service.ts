/**
 * Verification Manager Service
 * Centralized service to handle verification status updates based on events
 */

import { Pool } from 'pg';
import { verificationEvents, ProfileCompletionEvent, DocumentCompletionEvent, VerificationStatusEvent } from '../events/verification.events';

export class VerificationManagerService {
  private static instance: VerificationManagerService;
  private userDbPool: Pool;
  private docDbPool: Pool;

  private constructor() {
    this.userDbPool = new Pool({
      connectionString: process.env.USER_DATABASE_URL || 'postgresql://postgres:12345@localhost:5432/rabhan_user'
    });

    this.docDbPool = new Pool({
      connectionString: process.env.DOCUMENT_DATABASE_URL || 'postgresql://postgres:12345@localhost:5432/rabhan_document'
    });

    this.setupEventListeners();
  }

  public static getInstance(): VerificationManagerService {
    if (!VerificationManagerService.instance) {
      VerificationManagerService.instance = new VerificationManagerService();
    }
    return VerificationManagerService.instance;
  }

  private setupEventListeners(): void {
    // Listen for profile completion events
    verificationEvents.on('profile:completed', this.handleProfileCompletion.bind(this));
    
    // Listen for document completion events
    verificationEvents.on('documents:completed', this.handleDocumentCompletion.bind(this));
  }

  private async handleProfileCompletion(event: ProfileCompletionEvent): Promise<void> {
    try {
      console.log('🎯 Profile completion event received:', {
        userId: event.userId,
        completed: event.profileCompleted,
        percentage: event.completionPercentage
      });

      if (event.profileCompleted && event.completionPercentage >= 100) {
        await this.checkAndUpdateVerificationStatus(event.userId, 'profile_complete');
      }
    } catch (error) {
      console.error('❌ Error handling profile completion event:', error);
    }
  }

  private async handleDocumentCompletion(event: DocumentCompletionEvent): Promise<void> {
    try {
      console.log('🎯 Document completion event received:', {
        userId: event.userId,
        allCompleted: event.allDocumentsCompleted,
        completedDocs: event.completedDocuments.length,
        requiredDocs: event.requiredDocuments.length
      });

      if (event.allDocumentsCompleted) {
        await this.checkAndUpdateVerificationStatus(event.userId, 'documents_complete');
      }
    } catch (error) {
      console.error('❌ Error handling document completion event:', error);
    }
  }

  private async checkAndUpdateVerificationStatus(
    userId: string, 
    trigger: 'profile_complete' | 'documents_complete'
  ): Promise<void> {
    try {
      console.log(`🔄 Checking verification status after ${trigger} for user:`, userId);

      // Get current user profile status
      const userResult = await this.userDbPool.query(`
        SELECT profile_completed, profile_completion_percentage, verification_status 
        FROM user_profiles 
        WHERE auth_user_id = $1
      `, [userId]);

      if (userResult.rows.length === 0) {
        console.warn('❌ User profile not found for verification check:', userId);
        return;
      }

      const userProfile = userResult.rows[0];
      const profileComplete = userProfile.profile_completed || userProfile.profile_completion_percentage >= 100;

      // Check document completion status
      const docResult = await this.docDbPool.query(`
        SELECT dc.name as category_name, COUNT(d.id) as uploaded_count
        FROM document_categories dc
        LEFT JOIN documents d ON dc.id = d.category_id 
          AND d.user_id = $1 
          AND d.status IN ('completed', 'uploaded')
          AND d.approval_status IN ('approved', 'pending')
        WHERE dc.name IN ('national_id_front', 'national_id_back', 'proof_of_address')
        GROUP BY dc.id, dc.name
      `, [userId]);

      const requiredDocs = ['national_id_front', 'national_id_back', 'proof_of_address'];
      const allDocumentsUploaded = requiredDocs.every(docName => 
        docResult.rows.some(row => row.category_name === docName && parseInt(row.uploaded_count) > 0)
      );

      console.log('📊 Verification status check:', {
        userId,
        profileComplete,
        allDocumentsUploaded,
        currentStatus: userProfile.verification_status,
        trigger
      });

      // Determine new verification status
      const shouldBePending = profileComplete && allDocumentsUploaded;
      const currentStatus = userProfile.verification_status || 'not_verified';

      if (shouldBePending && currentStatus === 'not_verified') {
        await this.updateVerificationStatus(userId, currentStatus, 'pending', 'both_complete');
        console.log('✅ Verification status updated to pending for user:', userId);
      } else if (!shouldBePending && currentStatus === 'pending') {
        await this.updateVerificationStatus(userId, currentStatus, 'not_verified', 'requirements_not_met');
        console.log('⚠️ Verification status reverted to not_verified for user:', userId);
      } else {
        console.log('ℹ️ No verification status change needed for user:', userId);
      }

    } catch (error) {
      console.error('❌ Error checking verification status:', error);
    }
  }

  private async updateVerificationStatus(
    userId: string,
    oldStatus: string,
    newStatus: string,
    reason: string
  ): Promise<void> {
    try {
      await this.userDbPool.query(`
        UPDATE user_profiles 
        SET verification_status = $1, updated_at = CURRENT_TIMESTAMP 
        WHERE auth_user_id = $2
      `, [newStatus, userId]);

      // Emit verification status change event
      const statusEvent: VerificationStatusEvent = {
        userId,
        oldStatus: oldStatus as any,
        newStatus: newStatus as any,
        reason: reason as any,
        timestamp: new Date()
      };

      verificationEvents.emit('verification:status_changed', statusEvent);

      console.log('🎉 Verification status updated:', {
        userId,
        oldStatus,
        newStatus,
        reason
      });

    } catch (error) {
      console.error('❌ Error updating verification status:', error);
      throw error;
    }
  }

  // Method to manually trigger verification check (for testing)
  public async triggerVerificationCheck(userId: string): Promise<void> {
    await this.checkAndUpdateVerificationStatus(userId, 'profile_complete');
  }

  // Cleanup method
  public async cleanup(): Promise<void> {
    await this.userDbPool.end();
    await this.docDbPool.end();
  }
}

export const verificationManager = VerificationManagerService.getInstance();