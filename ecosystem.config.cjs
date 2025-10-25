module.exports = {
    apps: [
        {
            name: 'telegram-bot',
            script: './dist/index.js',
            node_args: '--env-file=.env',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '1G',
            env: {
                NODE_ENV: 'production',
            },
        },
    ],
};
