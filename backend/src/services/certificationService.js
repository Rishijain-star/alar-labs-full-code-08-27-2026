const BaseService = require("./baseService");
const certificationRepository = require("../repositories/certificationRepository");
const { AppError } = require("../middleware/errorHandler");
const logger = require("../lib/logger");

const mediaStorage = require("./mediaStorageService");

class CertificationService extends BaseService {
    constructor() {
        super(certificationRepository, "Certification");
    }

    async beforeCreate(data) {
        if (data._templateFile?.buffer) {
            data.template_url = await mediaStorage.saveByMime(
                data._templateFile.buffer,
                data._templateFile.originalname || "template.png",
                data._templateFile.mimetype || "image/png",
                { folder: "certifications" }
            );
            delete data._templateFile;
        }
        return data;
    }

    async beforeUpdate(id, data) {
        if (data._templateFile?.buffer) {
            data.template_url = await mediaStorage.saveByMime(
                data._templateFile.buffer,
                data._templateFile.originalname || "template.png",
                data._templateFile.mimetype || "image/png",
                { folder: "certifications" }
            );
            delete data._templateFile;
        }
        return data;
    }

    async getByIdFull(id) {
        try {
            const cert = await this.repo.findByIdFull(id);
            if (!cert) throw new AppError("Certification not found", 404);
            return cert;
        } catch (err) {
            if (err instanceof AppError) throw err;
            throw new AppError("Failed to fetch certification", 500);
        }
    }

    async getPublicByIdFull(id) {
        try {
            const cert = await this.repo.findPublicByIdFull(id);
            if (!cert) throw new AppError("Certification not found", 404);
            return cert;
        } catch (err) {
            if (err instanceof AppError) throw err;
            throw new AppError("Failed to fetch certification", 500);
        }
    }

    async afterDelete(existing) {
        await this.repo.invalidateFullCache(existing.id);
    }
}

module.exports = new CertificationService();