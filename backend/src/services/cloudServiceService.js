const BaseService = require("./baseService");
const cloudServiceRepository = require("../repositories/cloudServiceRepository");
const { AppError } = require("../middleware/errorHandler");

class CloudServiceService extends BaseService {
    constructor() {
        super(cloudServiceRepository, "CloudService");
    }

    async getByIdFull(id) {
        try {
            const record = await this.repo.findByIdFull(id);
            if (!record) throw new AppError("CloudService not found", 404);
            return record;
        } catch (err) {
            if (err instanceof AppError) throw err;
            throw new AppError("Failed to fetch cloud service", 500);
        }
    }

    async afterDelete(existing) {
        await this.repo.invalidateFullCache(existing.id);
    }

    // Override update from BaseService to invalidate full cache
    async update(id, data, options = {}) {
        const result = await super.update(id, data, options);
        await this.repo.invalidateFullCache(id);
        return result;
    }
}

module.exports = new CloudServiceService();
