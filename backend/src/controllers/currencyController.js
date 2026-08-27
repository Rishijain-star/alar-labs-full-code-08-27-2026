const currencyService = require("../services/currencyService");
const response = require("../utils/response");
const { AppError } = require("../middleware/errorHandler");
const { validate, fail } = require("../helper/helper");

class CurrencyController {
    getAll = async (req, res) => {
        try {
            const result = await currencyService.getAll();
            return response.success(res, "Currencies fetched", 200, result);
        } catch (err) { return fail(res, err); }
    };

    getById = async (req, res) => {
        try {
            const currency = await currencyService.getById(req.params.id);
            return response.success(res, "Currency fetched", 200, { currency });
        } catch (err) { return fail(res, err); }
    };

    create = async (req, res) => {
        try {
            await validate(req.body, {
                code: "required|string|minLength:3|maxLength:3",
                name: "required|string|minLength:3|maxLength:255",
                symbol: "required|string|minLength:1|maxLength:5",
                exchange_rate: "required|numeric|min:0",
            });

            const currency = await currencyService.create(req.body);

            return response.success(res, "Currency created", 201, { currency });
        } catch (err) { return fail(res, err); }
    };

    update = async (req, res) => {
        try {
            await validate(req.body, {
                code: "string|minLength:3|maxLength:3",
                name: "string|minLength:3|maxLength:255",
                symbol: "string|minLength:1|maxLength:5",
                exchange_rate: "numeric|min:0",
            });

            const currency = await currencyService.update(req.params.id, req.body);
            return response.success(res, "Currency updated", 200, { currency });
        } catch (err) { return fail(res, err); }
    };

    delete = async (req, res) => {
        try {
            await currencyService.delete(req.params.id);
            return response.success(res, "Currency deleted", 200);
        } catch (err) { return fail(res, err); }
    };
}

module.exports = new CurrencyController();