import { Router } from 'express';
import { validate } from '../middlewares/validate';
import auth from '../middlewares/auth';

import controller from '../../controllers/auth.controller';
import { createUserSchema, loginSchema } from '../../schemas/user.schema';

const router = Router();

router.post('/register', validate(createUserSchema), controller.register);
router.post('/login', validate(loginSchema), controller.login);
router.post('/refresh', auth, controller.refresh);

export default router;
