console.log('DEBUG: Script starting'); process.on('exit', (code) => console.log('Process exiting with code:', code)); process.on('uncaughtException', (err) => console.log('Uncaught exception:', err));
require('./dist/server.js');
