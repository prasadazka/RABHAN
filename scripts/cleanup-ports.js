const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

const RABHAN_PORTS = [3000, 3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008, 3009, 3010];

async function cleanupPorts() {
  console.log('🧹 Cleaning up RABHAN service ports...\n');

  for (const port of RABHAN_PORTS) {
    console.log(`Checking port ${port}...`);
    
    try {
      // Find processes using the port
      const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
      
      if (stdout.trim()) {
        const lines = stdout.trim().split('\n');
        const processIds = new Set();
        
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          if (pid && pid !== '0' && !isNaN(pid)) {
            processIds.add(pid);
          }
        }
        
        for (const pid of processIds) {
          try {
            await execAsync(`taskkill //F //PID ${pid}`);
            console.log(`  ✅ Terminated process ${pid} using port ${port}`);
          } catch (error) {
            console.log(`  ⚠️  Could not terminate process ${pid}: ${error.message}`);
          }
        }
      } else {
        console.log(`  ✅ Port ${port} is free`);
      }
    } catch (error) {
      console.log(`  ✅ Port ${port} is free`);
    }
  }
  
  console.log('\n🎉 Port cleanup completed!\n');
}

if (require.main === module) {
  cleanupPorts().catch(console.error);
}

module.exports = { cleanupPorts };