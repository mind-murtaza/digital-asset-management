import { Router } from 'express';
import auth from '../middlewares/auth';
import { validate } from '../middlewares/validate';

import controller from '../../controllers/project.controller';
import {
    createProjectSchema,
    updateProjectSchema,
    projectIdParamSchema,
    listProjectsQuerySchema,
    resolveByPathQuerySchema,
} from '../../schemas/project.schema';

const router = Router();

router.use(auth);

router.post('/', validate(createProjectSchema), controller.create);
router.get('/', validate(listProjectsQuerySchema, 'query'), controller.list);
router.get('/resolve', validate(resolveByPathQuerySchema, 'query'), controller.resolveByPath);
router.get('/:id', validate(projectIdParamSchema, 'params'), controller.getById);
router.patch(
    '/:id',
    validate(projectIdParamSchema, 'params'),
    validate(updateProjectSchema),
    controller.update,
);
router.delete('/:id', validate(projectIdParamSchema, 'params'), controller.softDelete);

export default router;
