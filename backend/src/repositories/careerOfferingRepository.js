const BaseRepository = require("./baseRepository");
const { CareerOffering, CareerRequest, User } = require("../models");

class CareerOfferingRepository extends BaseRepository {
    constructor() {
        super(CareerOffering, "career_offering", 1800);
    }

    async findByIdFull(id) {
        const key = `career_offering:full:${id}`;
        const cached = await this._get(key);
        if (cached) return cached;

        const record = await CareerOffering.findByPk(id, {
            include: [
                {
                    model: CareerRequest,
                    as: "requests",
                    include: [{ model: User, as: "user", attributes: ["user_id", "full_name", "email"] }],
                },
            ],
        });

        if (!record) return null;
        const data = record.toJSON();
        await this._set(key, data, this.ttl);
        return data;
    }

    async invalidateFullCache(id) {
        await this._del(`career_offering:full:${id}`, `career_offering:id:${id}`);
        await this._clearPattern("career_offering:list:*");
    }
}

module.exports = new CareerOfferingRepository();
