declare module '../api/routes/index' {}
declare module './api/routes/index.js' {
    import type { Router } from 'express';
    const router: Router;
    export default router;
}
