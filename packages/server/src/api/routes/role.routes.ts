import { Router } from 'express';
import auth from '../middlewares/auth';
import { validate } from '../middlewares/validate';

import controller from '../../controllers/role.controller';
import {
    roleCreateSchema,
    roleUpdateSchema,
    roleIdParamSchema,
    roleListQuerySchema,
} from '../../schemas/role.schema';

const router = Router();

router.use(auth);

router.post('/', validate(roleCreateSchema), controller.create);
router.get('/', validate(roleListQuerySchema, 'query'), controller.list);
router.get('/:id', validate(roleIdParamSchema, 'params'), controller.getById);
router.patch(
    '/:id',
    validate(roleIdParamSchema, 'params'),
    validate(roleUpdateSchema),
    controller.update,
);
router.delete('/:id', validate(roleIdParamSchema, 'params'), controller.remove);

export default router;
