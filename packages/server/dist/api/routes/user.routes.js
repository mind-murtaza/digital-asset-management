"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = __importDefault(require("../middlewares/auth"));
const validate_1 = require("../middlewares/validate");
const user_controller_1 = __importDefault(require("../../controllers/user.controller"));
const user_schema_1 = require("../../schemas/user.schema");
const router = (0, express_1.Router)();
router.use(auth_1.default);
router.get('/me', user_controller_1.default.me);
router.patch('/me/profile', (0, validate_1.validate)(user_schema_1.profileUpdateSchema), user_controller_1.default.updateProfile);
router.post('/me/change-password', (0, validate_1.validate)(user_schema_1.changePasswordSchema), user_controller_1.default.changePassword);
router.delete('/me', user_controller_1.default.softDelete);
exports.default = router;
