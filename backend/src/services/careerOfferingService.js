const BaseService = require("./baseService");
const careerOfferingRepository = require("../repositories/careerOfferingRepository");
const { AppError } = require("../middleware/errorHandler");

class CareerOfferingService extends BaseService {
    constructor() {
        super(careerOfferingRepository, "CareerOffering");
    }

    async getByIdFull(id) {
        try {
            const record = await this.repo.findByIdFull(id);
            if (!record) throw new AppError("CareerOffering not found", 404);
            return record;
        } catch (err) {
            if (err instanceof AppError) throw err;
            throw new AppError("Failed to fetch career offering", 500);
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

module.exports = new CareerOfferingService();
