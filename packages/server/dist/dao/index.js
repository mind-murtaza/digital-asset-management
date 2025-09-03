"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userDao = exports.roleDao = exports.projectDao = exports.organizationDao = exports.assetDao = void 0;
const asset_dao_1 = __importDefault(require("./asset.dao"));
exports.assetDao = asset_dao_1.default;
const organization_dao_1 = __importDefault(require("./organization.dao"));
exports.organizationDao = organization_dao_1.default;
const project_dao_1 = __importDefault(require("./project.dao"));
exports.projectDao = project_dao_1.default;
const role_dao_1 = __importDefault(require("./role.dao"));
exports.roleDao = role_dao_1.default;
const user_dao_1 = __importDefault(require("./user.dao"));
exports.userDao = user_dao_1.default;
