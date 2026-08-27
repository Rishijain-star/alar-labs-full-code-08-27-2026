const { AppError } = require("../middleware/errorHandler");
const logger = require("../lib/logger");

class BaseService {
    constructor(repository, entityName) {
        this.repo = repository;
        this.entity = entityName;
    }

    // Override in child classes to add business logic
    async beforeCreate(data) { return data; }
    async afterCreate(record) { return record; }
    async beforeUpdate(id, data) { return data; }
    async afterDelete(existing) { }

    async getAll(options = {}) {
        try {
            return await this.repo.findAll(options);
        } catch (err) {
            if (err instanceof AppError) throw err;
            logger.error(`[${this.entity}Service] getAll:`, err);
            throw new AppError(`Failed to fetch ${this.entity} list`, 500);
        }
    }

    async getById(id, options = {}) {
        try {
            const record = await this.repo.findById(id, options);
            if (!record) throw new AppError(`${this.entity} not found`, 404);
            return record;
        } catch (err) {
            if (err instanceof AppError) throw err;
            logger.error(`[${this.entity}Service] getById:`, err);
            throw new AppError(`Failed to fetch ${this.entity}`, 500);
        }
    }

    async create(data, options = {}) {
        try {
            const prepared = await this.beforeCreate(data);
            const record = await this.repo.create(prepared, options);
            return await this.afterCreate(record);
        } catch (err) {
            if (err instanceof AppError) throw err;
            if (err.name === "SequelizeValidationError" && Array.isArray(err.errors) && err.errors.length) {
                const msg = err.errors.map((e) => e.message).join("; ");
                throw new AppError(msg, 400);
            }
            if (err.name === "SequelizeUniqueConstraintError") {
                const path = err.errors?.[0]?.path || (err.fields && Object.keys(err.fields)[0]);
                const val = err.fields?.[path] ?? err.errors?.[0]?.value;
                let msg = "This value already exists.";
                if (path === "slug") {
                    msg = `The URL slug "${val}" is already in use. Use a different lab or course code.`;
                }
                throw new AppError(msg, 409);
            }
            logger.error(`[${this.entity}Service] create:`, err);
            throw new AppError(`Failed to create ${this.entity}`, 400);
        }
    }

    async update(id, data, options = {}) {
        try {
            await this.getById(id);
            const prepared = await this.beforeUpdate(id, data);
            return await this.repo.update(id, prepared, options);
        } catch (err) {
            if (err instanceof AppError) throw err;
            logger.error(`[${this.entity}Service] update:`, err);
            throw new AppError(`Failed to update ${this.entity}`, 500);
        }
    }

    async delete(id) {
        try {
            const existing = await this.getById(id);
            await this.repo.delete(id);
            await this.afterDelete(existing);
            return true;
        } catch (err) {
            if (err instanceof AppError) throw err;
            logger.error(`[${this.entity}Service] delete:`, err);
            throw new AppError(`Failed to delete ${this.entity}`, 500);
        }
    }
}

module.exports = BaseService;