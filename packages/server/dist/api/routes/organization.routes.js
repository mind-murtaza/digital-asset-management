"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = __importDefault(require("../middlewares/auth"));
const validate_1 = require("../middlewares/validate");
const organization_controller_1 = __importDefault(require("../../controllers/organization.controller"));
const organization_schema_1 = require("../../schemas/organization.schema");
const router = (0, express_1.Router)();
router.use(auth_1.default);
router.post('/', (0, validate_1.validate)(organization_schema_1.createOrganizationSchema), organization_controller_1.default.create);
router.get('/', (0, validate_1.validate)(organization_schema_1.listOrganizationsQuerySchema, 'query'), organization_controller_1.default.list);
router.get('/:id', (0, validate_1.validate)(organization_schema_1.organizationIdParamSchema, 'params'), organization_controller_1.default.getById);
router.patch('/:id', (0, validate_1.validate)(organization_schema_1.organizationIdParamSchema, 'params'), (0, validate_1.validate)(organization_schema_1.updateOrganizationSchema), organization_controller_1.default.update);
router.delete('/:id', (0, validate_1.validate)(organization_schema_1.organizationIdParamSchema, 'params'), organization_controller_1.default.archive);
exports.default = router;
