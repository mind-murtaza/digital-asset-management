import { Router } from 'express';
import auth from '../middlewares/auth';
import { validate } from '../middlewares/validate';

import controller from '../../controllers/organization.controller';
import {
    createOrganizationSchema,
    updateOrganizationSchema,
    organizationIdParamSchema,
    listOrganizationsQuerySchema,
} from '../../schemas/organization.schema';

const router = Router();

router.use(auth);

router.post('/', validate(createOrganizationSchema), controller.create);
router.get('/', validate(listOrganizationsQuerySchema, 'query'), controller.list);
router.get('/:id', validate(organizationIdParamSchema, 'params'), controller.getById);
router.patch(
    '/:id',
    validate(organizationIdParamSchema, 'params'),
    validate(updateOrganizationSchema),
    controller.update,
);
router.delete('/:id', validate(organizationIdParamSchema, 'params'), controller.archive);

export default router;
