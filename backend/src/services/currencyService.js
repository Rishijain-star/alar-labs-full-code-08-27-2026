const { Currency } = require("../models");

class CurrencyService {
    async getAll() {
        return await Currency.findAll();
    }

    async getById(id) {
        return await Currency.findByPk(id);
    }

    async create(data) {
        return await Currency.create(data);
    }

    async update(id, data) {
        const currency = await Currency.findByPk(id);
        if (!currency) {
            throw new Error("Currency not found");
        }
        return await currency.update(data);
    }

    async delete(id) {
        const currency = await Currency.findByPk(id);
        if (!currency) {
            throw new Error("Currency not found");
        }
        return await currency.destroy();
    }
}

module.exports = new CurrencyService();