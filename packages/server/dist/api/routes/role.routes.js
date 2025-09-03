"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = __importDefault(require("../middlewares/auth"));
const validate_1 = require("../middlewares/validate");
const role_controller_1 = __importDefault(require("../../controllers/role.controller"));
const role_schema_1 = require("../../schemas/role.schema");
const router = (0, express_1.Router)();
router.use(auth_1.default);
router.post('/', (0, validate_1.validate)(role_schema_1.roleCreateSchema), role_controller_1.default.create);
router.get('/', (0, validate_1.validate)(role_schema_1.roleListQuerySchema, 'query'), role_controller_1.default.list);
router.get('/:id', (0, validate_1.validate)(role_schema_1.roleIdParamSchema, 'params'), role_controller_1.default.getById);
router.patch('/:id', (0, validate_1.validate)(role_schema_1.roleIdParamSchema, 'params'), (0, validate_1.validate)(role_schema_1.roleUpdateSchema), role_controller_1.default.update);
router.delete('/:id', (0, validate_1.validate)(role_schema_1.roleIdParamSchema, 'params'), role_controller_1.default.remove);
exports.default = router;
