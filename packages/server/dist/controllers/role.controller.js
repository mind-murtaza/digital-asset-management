"use strict";
/**
 * Role Controller (TypeScript)
 */
const roleService = require('../services/role.service');
function forwardRoleError(err, next) {
    if (err && (err.code === 11000 || err.code === 11001)) {
        err.status = err.status || 409;
        err.message = err.message || 'Duplicate resource';
        err.code = err.code || 'DUPLICATE_RESOURCE';
    }
    if (!err.status) {
        err.status = 500;
        err.code = err.code || 'ROLE_CONTROLLER_ERROR';
    }
    return next(err);
}
async function create(req, res, next) {
    try {
        const result = await roleService.create(req.body);
        res.status(201).json({ success: true, data: result });
    }
    catch (err) {
        forwardRoleError(err, next);
    }
}
async function list(req, res, next) {
    try {
        const result = await roleService.list(req.query);
        res.json({ success: true, data: result });
    }
    catch (err) {
        forwardRoleError(err, next);
    }
}
async function getById(req, res, next) {
    try {
        const result = await roleService.getById(req.params.id);
        res.json({ success: true, data: result });
    }
    catch (err) {
        forwardRoleError(err, next);
    }
}
async function update(req, res, next) {
    try {
        const result = await roleService.update(req.params.id, req.body);
        res.json({ success: true, data: result });
    }
    catch (err) {
        forwardRoleError(err, next);
    }
}
async function remove(req, res, next) {
    try {
        await roleService.remove(req.params.id);
        res.status(204).send();
    }
    catch (err) {
        forwardRoleError(err, next);
    }
}
const controller = { create, list, getById, update, remove };
module.exports = controller;
