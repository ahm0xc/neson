import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  // Don't launch a browser in dev; load the unpacked extension manually.
  webExt: {
    disabled: true,
  },
  manifest: {
    name: 'Neson Download Bridge',
    description:
      'Send browser downloads to the Neson desktop download manager instead of Chrome.',
    permissions: ['downloads', 'storage'],
    host_permissions: ['http://127.0.0.1/*', 'http://localhost/*'],
  },
});
