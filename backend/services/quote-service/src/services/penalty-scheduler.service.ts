import * as cron from 'node-cron';
import { penaltyService } from './penalty.service';
import { logger, auditLogger } from '../utils/logger';

export class PenaltySchedulerService {
  private isRunning: boolean = false;
  private scheduledJobs: Map<string, any> = new Map();

  /**
   * Initialize penalty scheduler
   */
  public initialize(): void {
    try {
      // Schedule daily penalty check at 2 AM
      this.scheduleJob('daily-penalty-check', '0 2 * * *', async () => {
        await this.runDailyPenaltyCheck();
      });

      // Schedule hourly SLA monitoring
      this.scheduleJob('hourly-sla-monitor', '0 * * * *', async () => {
        await this.runHourlySLAMonitor();
      });

      // Schedule weekly penalty statistics
      this.scheduleJob('weekly-penalty-stats', '0 9 * * 1', async () => {
        await this.runWeeklyPenaltyStats();
      });

      this.isRunning = true;
      
      logger.info('Penalty scheduler initialized', {
        scheduled_jobs: Array.from(this.scheduledJobs.keys()),
        total_jobs: this.scheduledJobs.size
      });

    } catch (error) {
      logger.error('Failed to initialize penalty scheduler', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Stop penalty scheduler
   */
  public stop(): void {
    try {
      this.scheduledJobs.forEach((task, jobName) => {
        task.stop();
        logger.debug('Stopped scheduled job', { job_name: jobName });
      });

      this.scheduledJobs.clear();
      this.isRunning = false;

      logger.info('Penalty scheduler stopped', {
        stopped_jobs: this.scheduledJobs.size
      });

    } catch (error) {
      logger.error('Failed to stop penalty scheduler', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get scheduler status
   */
  public getStatus(): {
    isRunning: boolean;
    scheduledJobs: string[];
    nextExecutions: { [key: string]: string };
  } {
    const nextExecutions: { [key: string]: string } = {};
    
    this.scheduledJobs.forEach((task, jobName) => {
      // Note: node-cron doesn't provide next execution time directly
      // This would need additional implementation for precise timing
      nextExecutions[jobName] = 'Next execution time calculation needed';
    });

    return {
      isRunning: this.isRunning,
      scheduledJobs: Array.from(this.scheduledJobs.keys()),
      nextExecutions
    };
  }

  /**
   * Run manual penalty check (for admin trigger)
   */
  public async runManualPenaltyCheck(): Promise<{
    violationsDetected: number;
    penaltiesApplied: number;
    errors: number;
  }> {
    const startTime = Date.now();
    
    try {
      auditLogger.security('MANUAL_PENALTY_CHECK_STARTED', {
        timestamp: new Date().toISOString(),
        triggered_by: 'admin'
      });

      // Detect SLA violations
      const violations = await penaltyService.detectSLAViolations();
      
      // Process automatic penalties
      const appliedPenalties = await penaltyService.processAutomaticPenalties(violations);

      const result = {
        violationsDetected: violations.length,
        penaltiesApplied: appliedPenalties.length,
        errors: violations.length - appliedPenalties.length
      };

      const duration = Date.now() - startTime;

      auditLogger.financial('MANUAL_PENALTY_CHECK_COMPLETED', {
        ...result,
        duration_ms: duration,
        timestamp: new Date().toISOString()
      });

      logger.info('Manual penalty check completed', {
        ...result,
        duration_ms: duration
      });

      return result;

    } catch (error) {
      logger.error('Manual penalty check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration_ms: Date.now() - startTime
      });

      throw error;
    }
  }

  // Private methods

  private scheduleJob(jobName: string, cronExpression: string, callback: () => Promise<void>): void {
    try {
      const task = cron.schedule(cronExpression, async () => {
        logger.debug('Starting scheduled job', { job_name: jobName });
        
        try {
          await callback();
          logger.debug('Scheduled job completed successfully', { job_name: jobName });
        } catch (error) {
          logger.error('Scheduled job failed', {
            job_name: jobName,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }, {
        timezone: 'Asia/Riyadh' // Saudi Arabia timezone
      });

      this.scheduledJobs.set(jobName, task);
      
      logger.debug('Scheduled job created', {
        job_name: jobName,
        cron_expression: cronExpression,
        timezone: 'Asia/Riyadh'
      });

    } catch (error) {
      logger.error('Failed to schedule job', {
        job_name: jobName,
        cron_expression: cronExpression,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async runDailyPenaltyCheck(): Promise<void> {
    const startTime = Date.now();
    
    try {
      logger.info('Starting daily penalty check');

      auditLogger.security('DAILY_PENALTY_CHECK_STARTED', {
        timestamp: new Date().toISOString(),
        scheduled: true
      });

      // Detect SLA violations
      const violations = await penaltyService.detectSLAViolations();

      if (violations.length === 0) {
        logger.info('Daily penalty check completed - no violations found');
        return;
      }

      // Process automatic penalties for detected violations
      const appliedPenalties = await penaltyService.processAutomaticPenalties(violations);

      const duration = Date.now() - startTime;
      const errors = violations.length - appliedPenalties.length;

      auditLogger.financial('DAILY_PENALTY_CHECK_COMPLETED', {
        violations_detected: violations.length,
        penalties_applied: appliedPenalties.length,
        errors: errors,
        duration_ms: duration,
        timestamp: new Date().toISOString()
      });

      logger.info('Daily penalty check completed', {
        violations_detected: violations.length,
        penalties_applied: appliedPenalties.length,
        errors: errors,
        duration_ms: duration
      });

      // Send alerts if there were errors
      if (errors > 0) {
        logger.warn('Some penalties could not be applied automatically', {
          failed_penalties: errors,
          total_violations: violations.length
        });
      }

    } catch (error) {
      logger.error('Daily penalty check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration_ms: Date.now() - startTime
      });

      auditLogger.security('DAILY_PENALTY_CHECK_FAILED', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }

  private async runHourlySLAMonitor(): Promise<void> {
    try {
      logger.debug('Starting hourly SLA monitor');

      // Detect SLA violations without applying penalties
      const violations = await penaltyService.detectSLAViolations();

      // Log critical violations for immediate attention
      const criticalViolations = violations.filter(v => v.severity_level === 'critical');
      
      if (criticalViolations.length > 0) {
        logger.warn('Critical SLA violations detected', {
          critical_violations: criticalViolations.length,
          total_violations: violations.length,
          contractors_affected: [...new Set(criticalViolations.map(v => v.contractor_id))].length
        });

        auditLogger.financial('CRITICAL_SLA_VIOLATIONS_DETECTED', {
          critical_violations: criticalViolations.length,
          contractors: [...new Set(criticalViolations.map(v => v.contractor_id))],
          timestamp: new Date().toISOString()
        });
      }

      logger.debug('Hourly SLA monitor completed', {
        total_violations: violations.length,
        critical_violations: criticalViolations.length
      });

    } catch (error) {
      logger.error('Hourly SLA monitor failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async runWeeklyPenaltyStats(): Promise<void> {
    try {
      logger.info('Starting weekly penalty statistics');

      // This would generate penalty statistics report
      // Implementation would depend on reporting requirements
      
      auditLogger.financial('WEEKLY_PENALTY_STATS_GENERATED', {
        timestamp: new Date().toISOString(),
        week_start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      });

      logger.info('Weekly penalty statistics completed');

    } catch (error) {
      logger.error('Weekly penalty statistics failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export const penaltySchedulerService = new PenaltySchedulerService();