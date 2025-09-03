"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = __importDefault(require("../middlewares/auth"));
const validate_1 = require("../middlewares/validate");
const project_controller_1 = __importDefault(require("../../controllers/project.controller"));
const project_schema_1 = require("../../schemas/project.schema");
const router = (0, express_1.Router)();
router.use(auth_1.default);
router.post('/', (0, validate_1.validate)(project_schema_1.createProjectSchema), project_controller_1.default.create);
router.get('/', (0, validate_1.validate)(project_schema_1.listProjectsQuerySchema, 'query'), project_controller_1.default.list);
router.get('/resolve', (0, validate_1.validate)(project_schema_1.resolveByPathQuerySchema, 'query'), project_controller_1.default.resolveByPath);
router.get('/:id', (0, validate_1.validate)(project_schema_1.projectIdParamSchema, 'params'), project_controller_1.default.getById);
router.patch('/:id', (0, validate_1.validate)(project_schema_1.projectIdParamSchema, 'params'), (0, validate_1.validate)(project_schema_1.updateProjectSchema), project_controller_1.default.update);
router.delete('/:id', (0, validate_1.validate)(project_schema_1.projectIdParamSchema, 'params'), project_controller_1.default.softDelete);
exports.default = router;
