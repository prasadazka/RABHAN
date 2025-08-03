#!/usr/bin/env node

import { logger } from './utils/logger';
import documentService from './server';

// Start the Document Service
async function main() {
  try {
    logger.info('Starting RABHAN Document Service');
    await documentService.start();
  } catch (error) {
    logger.error('Failed to start Document Service:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
}

// Run the service
main();

export default documentService;