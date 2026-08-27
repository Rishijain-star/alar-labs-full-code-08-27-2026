const instructorResourceService = require('../services/instructorResourceService');

exports.create = async (req, res, next) => {
    try {
        const resource = await instructorResourceService.createResource(req.body, req.user.user_id);
        res.status(201).json(resource);
    } catch (err) {
        next(err);
    }
};

exports.update = async (req, res, next) => {
    try {
        const resource = await instructorResourceService.updateResource(req.params.id, req.body, req.user.user_id);
        res.json(resource);
    } catch (err) {
        next(err);
    }
};

exports.delete = async (req, res, next) => {
    try {
        await instructorResourceService.deleteResource(req.params.id);
        res.json({ message: "Deleted successfully" });
    } catch (err) {
        next(err);
    }
};

exports.list = async (req, res, next) => {
    try {
        const resources = await instructorResourceService.listResources(req.query);
        res.json(resources);
    } catch (err) {
        next(err);
    }
};

exports.download = async (req, res, next) => {
    try {
        const hasAccess = await instructorResourceService.checkAccess(req.params.id, req.user.user_id);
        if (!hasAccess) {
            return res.status(403).json({ message: "You do not have access to this resource." });
        }
        const resource = await instructorResourceService.getResourceById(req.params.id);
        if (!resource) return res.status(404).json({ message: "Resource not found" });

        res.json({ file_url: resource.file_url });
    } catch (err) {
        next(err);
    }
};

exports.optIn = async (req, res, next) => {
    try {
        const { optedIn } = req.body;
        const result = await instructorResourceService.optInUser(req.params.id, req.user.user_id, optedIn);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

exports.getOptInStatus = async (req, res, next) => {
    try {
        const optedIn = await instructorResourceService.getUserOptInStatus(req.params.id, req.user.user_id);
        res.json({ optedIn });
    } catch (err) {
        next(err);
    }
};
