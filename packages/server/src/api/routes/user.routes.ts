import { Router } from 'express';
import auth from '../middlewares/auth';
import { validate } from '../middlewares/validate';

import controller from '../../controllers/user.controller';
import { profileUpdateSchema, changePasswordSchema } from '../../schemas/user.schema';

const router = Router();

router.use(auth);

router.get('/me', controller.me);
router.patch('/me/profile', validate(profileUpdateSchema), controller.updateProfile);
router.post('/me/change-password', validate(changePasswordSchema), controller.changePassword);
router.delete('/me', controller.softDelete);

export default router;
