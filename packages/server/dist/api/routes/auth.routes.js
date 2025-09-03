"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const validate_1 = require("../middlewares/validate");
const auth_1 = __importDefault(require("../middlewares/auth"));
const auth_controller_1 = __importDefault(require("../../controllers/auth.controller"));
const user_schema_1 = require("../../schemas/user.schema");
const router = (0, express_1.Router)();
router.post('/register', (0, validate_1.validate)(user_schema_1.createUserSchema), auth_controller_1.default.register);
router.post('/login', (0, validate_1.validate)(user_schema_1.loginSchema), auth_controller_1.default.login);
router.post('/refresh', auth_1.default, auth_controller_1.default.refresh);
exports.default = router;
