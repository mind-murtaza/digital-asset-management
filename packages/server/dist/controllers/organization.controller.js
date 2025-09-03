"use strict";
/**
 * Organization Controller (TypeScript)
 */
const organizationService = require('../services/organization.service');
function forwardOrgError(err, next) {
    if (err && (err.code === 11000 || err.code === 11001)) {
        err.status = err.status || 409;
        err.message = err.message || 'Duplicate resource';
        err.code = err.code || 'DUPLICATE_RESOURCE';
    }
    if (!err.status) {
        err.status = 500;
        err.code = err.code || 'ORGANIZATION_CONTROLLER_ERROR';
    }
    return next(err);
}
async function create(req, res, next) {
    try {
        const result = await organizationService.create(req.body, req.auth);
        res.status(201).json({ success: true, data: result });
    }
    catch (err) {
        forwardOrgError(err, next);
    }
}
async function list(req, res, next) {
    try {
        const result = await organizationService.list(req.query);
        res.json({ success: true, data: result });
    }
    catch (err) {
        forwardOrgError(err, next);
    }
}
async function getById(req, res, next) {
    try {
        const result = await organizationService.getById(req.params.id);
        res.json({ success: true, data: result });
    }
    catch (err) {
        forwardOrgError(err, next);
    }
}
async function update(req, res, next) {
    try {
        const result = await organizationService.update(req.params.id, req.body);
        res.json({ success: true, data: result });
    }
    catch (err) {
        forwardOrgError(err, next);
    }
}
async function archive(req, res, next) {
    try {
        await organizationService.archive(req.params.id);
        res.status(204).send();
    }
    catch (err) {
        forwardOrgError(err, next);
    }
}
const controller = { create, list, getById, update, archive };
module.exports = controller;
