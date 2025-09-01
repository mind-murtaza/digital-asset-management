/**
 * Project Controller (TypeScript)
 */

import type { Request, Response, NextFunction } from 'express';
const projectService = require('../services/project.service');

function forwardProjectError(err: any, next: NextFunction) {
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

async function create(req: Request, res: Response, next: NextFunction) {
    try {
        const result = await projectService.create(req.body, (req as any).auth);
        res.status(201).json({ success: true, data: result });
    } catch (err) {
        forwardProjectError(err, next);
    }
}

async function list(req: Request, res: Response, next: NextFunction) {
    try {
        const result = await projectService.list(req.query as any);
        res.json({ success: true, data: result });
    } catch (err) {
        forwardProjectError(err, next);
    }
}

async function resolveByPath(req: Request, res: Response, next: NextFunction) {
    try {
        const { organizationId, path } = (req.query || {}) as any;
        const result = await projectService.resolveByPath(organizationId, path);
        res.json({ success: true, data: result });
    } catch (err) {
        forwardProjectError(err, next);
    }
}

async function getById(req: Request, res: Response, next: NextFunction) {
    try {
        const result = await projectService.getById((req.params as any).id);
        res.json({ success: true, data: result });
    } catch (err) {
        forwardProjectError(err, next);
    }
}

async function update(req: Request, res: Response, next: NextFunction) {
    try {
        const result = await projectService.update((req.params as any).id, req.body);
        res.json({ success: true, data: result });
    } catch (err) {
        forwardProjectError(err, next);
    }
}

async function softDelete(req: Request, res: Response, next: NextFunction) {
    try {
        await projectService.softDelete((req.params as any).id);
        res.status(204).send();
    } catch (err) {
        forwardProjectError(err, next);
    }
}

const controller = { create, list, resolveByPath, getById, update, softDelete };
export = controller;
