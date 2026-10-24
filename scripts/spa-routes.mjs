// Static hosts without rewrite rules: give every app route its own index.html copy.
import { cpSync, mkdirSync } from 'node:fs';

const routes = [
  'subjects', 'subjects/plan', 'pyqs', 'pyqs/bank', 'pyqs/analysis', 'pyqs/numerical', 'pyqs/similar', 'pyqs/generate',
  'practicals', 'assessment', 'ramble', 'blog', 'settings',
];
for (const r of routes) {
  mkdirSync(`dist/${r}`, { recursive: true });
  cpSync('dist/index.html', `dist/${r}/index.html`);
}
cpSync('dist/index.html', 'dist/404.html');
console.log('SPA route pages written');
