/**
 * Organization Controller (TypeScript)
 */

import type { Request, Response, NextFunction } from 'express';
const organizationService = require('../services/organization.service');

function forwardOrgError(err: any, next: NextFunction) {
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

async function create(req: Request, res: Response, next: NextFunction) {
    try {
        const result = await organizationService.create(req.body);
        res.status(201).json({ success: true, data: result });
    } catch (err) {
        forwardOrgError(err, next);
    }
}

async function list(req: Request, res: Response, next: NextFunction) {
    try {
        const result = await organizationService.list(req.query as any);
        res.json({ success: true, data: result });
    } catch (err) {
        forwardOrgError(err, next);
    }
}

async function getById(req: Request, res: Response, next: NextFunction) {
    try {
        const result = await organizationService.getById((req.params as any).id);
        res.json({ success: true, data: result });
    } catch (err) {
        forwardOrgError(err, next);
    }
}

async function update(req: Request, res: Response, next: NextFunction) {
    try {
        const result = await organizationService.update((req.params as any).id, req.body);
        res.json({ success: true, data: result });
    } catch (err) {
        forwardOrgError(err, next);
    }
}

async function archive(req: Request, res: Response, next: NextFunction) {
    try {
        await organizationService.archive((req.params as any).id);
        res.status(204).send();
    } catch (err) {
        forwardOrgError(err, next);
    }
}

const controller = { create, list, getById, update, archive };
export = controller;
