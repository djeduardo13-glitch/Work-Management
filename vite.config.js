import { defineConfig } from 'vite';

// base relativa: funziona su https://utente.github.io/<nome-repo>/ senza configurare nulla
export default defineConfig({   
  base: '/Work-Management/',
  })
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: false,
    target: 'es2020',
  },
  server: { port: 5173 },
});
