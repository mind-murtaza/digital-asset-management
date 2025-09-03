"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const Asset_model_1 = __importDefault(require("./Asset.model"));
const Organization_model_1 = __importDefault(require("./Organization.model"));
const Project_model_1 = __importDefault(require("./Project.model"));
const Role_model_1 = __importDefault(require("./Role.model"));
const User_model_1 = __importDefault(require("./User.model"));
const models = {
    Asset: Asset_model_1.default,
    Organization: Organization_model_1.default,
    Project: Project_model_1.default,
    Role: Role_model_1.default,
    User: User_model_1.default
};
module.exports = models;
