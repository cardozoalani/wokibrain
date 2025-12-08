// Setup file to handle MongoDB client cleanup errors gracefully
// These errors occur when MongoDB clients are closed during async operations
// They don't affect test results but generate noise in the output

process.on('unhandledRejection', (reason: any) => {
  // Ignore MongoDB client closed errors during test cleanup
  if (
    reason?.name === 'MongoClientClosedError' ||
    reason?.errmsg?.includes('client was closed') ||
    reason?.errmsg?.includes('Operation interrupted because client was closed')
  ) {
    // These are expected during test cleanup and don't affect test results
    return;
  }

  // Re-throw other unhandled rejections
  throw reason;
});



