"use strict";
/**
 * Project Controller (TypeScript)
 */
const projectService = require('../services/project.service');
function forwardProjectError(err, next) {
    if (err && (err.code === 11000 || err.code === 11001)) {
        err.status = err.status || 409;
        err.message = err.message || 'Duplicate resource';
        err.code = err.code || 'DUPLICATE_RESOURCE';
    }
    if (!err.status) {
        err.status = 500;
        err.code = err.code || 'PROJECT_CONTROLLER_ERROR';
    }
    return next(err);
}
async function create(req, res, next) {
    try {
        const result = await projectService.create(req.body, req.auth);
        res.status(201).json({ success: true, data: result });
    }
    catch (err) {
        forwardProjectError(err, next);
    }
}
async function list(req, res, next) {
    try {
        const result = await projectService.list(req.query);
        res.json({ success: true, data: result });
    }
    catch (err) {
        forwardProjectError(err, next);
    }
}
async function resolveByPath(req, res, next) {
    try {
        const { organizationId, path } = (req.query || {});
        const result = await projectService.resolveByPath(organizationId, path);
        res.json({ success: true, data: result });
    }
    catch (err) {
        forwardProjectError(err, next);
    }
}
async function getById(req, res, next) {
    try {
        const result = await projectService.getById(req.params.id);
        res.json({ success: true, data: result });
    }
    catch (err) {
        forwardProjectError(err, next);
    }
}
async function update(req, res, next) {
    try {
        const result = await projectService.update(req.params.id, req.body);
        res.json({ success: true, data: result });
    }
    catch (err) {
        forwardProjectError(err, next);
    }
}
async function softDelete(req, res, next) {
    try {
        await projectService.softDelete(req.params.id);
        res.status(204).send();
    }
    catch (err) {
        forwardProjectError(err, next);
    }
}
const controller = { create, list, resolveByPath, getById, update, softDelete };
module.exports = controller;
