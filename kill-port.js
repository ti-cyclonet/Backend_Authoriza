const { execSync } = require('child_process');

try {
  const result = execSync('netstat -ano | findstr ":3000 "', { shell: 'cmd.exe' }).toString();
  const lines = result.trim().split('\n');
  const pids = new Set();

  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    const pid = parts[parts.length - 1];
    if (pid && pid !== '0') pids.add(pid);
  }

  for (const pid of pids) {
    try {
      execSync(`taskkill /PID ${pid} /F`, { shell: 'cmd.exe', stdio: 'ignore' });
      console.log(`Proceso ${pid} terminado`);
    } catch (e) {}
  }
} catch (e) {
  // Puerto ya libre
}
