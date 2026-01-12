const { exec } = require('child_process');
const path = require('path');

console.log("Starting ngrok tunnel for port 3000...");

// TIP: For a permanent URL, use an ngrok static domain:
// const ngrokProcess = exec('ngrok http --domain=your-domain.ngrok-free.app 3000');
const ngrokProcess = exec('ngrok http 3000');

ngrokProcess.stdout.on('data', (data) => {
    console.log(`[ngrok-stdout]: ${data}`);
});

ngrokProcess.stderr.on('data', (data) => {
    console.error(`[ngrok-stderr]: ${data}`);
});

ngrokProcess.on('close', (code) => {
    console.log(`ngrok process exited with code ${code}`);
});
