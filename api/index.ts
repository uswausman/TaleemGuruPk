import serverModule from '../dist/server.cjs';

const app = (serverModule && serverModule.default) ? serverModule.default : serverModule;

export default app;

