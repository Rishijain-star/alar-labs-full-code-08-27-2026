const BaseRepository = require("./baseRepository");
const { CloudService, CloudServiceRequest, User } = require("../models");

class CloudServiceRepository extends BaseRepository {
    constructor() {
        super(CloudService, "cloud_service", 1800);
    }

    async findByIdFull(id) {
        const key = `cloud_service:full:${id}`;
        const cached = await this._get(key);
        if (cached) return cached;

        const record = await CloudService.findByPk(id, {
            include: [
                {
                    model: CloudServiceRequest,
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
        await this._del(`cloud_service:full:${id}`, `cloud_service:id:${id}`);
        await this._clearPattern("cloud_service:list:*");
    }
}

module.exports = new CloudServiceRepository();
