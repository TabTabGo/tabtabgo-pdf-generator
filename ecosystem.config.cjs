module.exports = {
  apps: [
    {
      name: 'tabtabgo-generator',
      script: 'dist/index.js',
      cwd: '/opt/tabtabgo/generator',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
