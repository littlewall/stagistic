import 'dotenv/config';

console.log('🔧 Worker service starting...');
console.log('This is a placeholder for background job processing.');
console.log('Future features: email sending, export generation, sync tasks, etc.');

// Keep the process running
setInterval(() => {
    console.log(`Worker heartbeat: ${new Date().toISOString()}`);
}, 30000);
