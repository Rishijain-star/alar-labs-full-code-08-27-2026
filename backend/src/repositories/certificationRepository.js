const BaseRepository = require("./baseRepository");
const { Certification, Course, Lab } = require("../models");

class CertificationRepository extends BaseRepository {
    constructor() {
        super(Certification, "cert", 1800);
    }

    /** Full cert with all courses and labs referencing it */
    async findByIdFull(id) {
        const key = `cert:full:${id}`;
        const cached = await this._get(key);
        if (cached) return cached;

        const record = await Certification.findByPk(id, {
            include: [
                {
                    model: Course,
                    as: "courses",
                    attributes: ["id", "title", "slug", "status"],
                    required: false,
                },
                {
                    model: Lab,
                    as: "labs",
                    attributes: ["id", "title", "slug", "status"],
                    required: false,
                },
            ],
        });

        if (!record) return null;
        const data = record.toJSON();
        await this._set(key, data, this.ttl);
        return data;
    }

    /**
     * Public cert detail — active cert only, with its PUBLISHED courses and labs.
     * Returns null if the cert is missing or inactive.
     */
    async findPublicByIdFull(id) {
        const key = `cert:public:full:${id}`;
        const cached = await this._get(key);
        if (cached) return cached;

        const record = await Certification.findByPk(id, {
            where: { is_active: true },
            include: [
                {
                    model: Course,
                    as: "courses",
                    attributes: [
                        "id", "title", "slug", "description", "thumbnail",
                        "level", "duration_minutes", "is_free", "price",
                    ],
                    where: { status: "published" },
                    required: false,
                },
                {
                    model: Lab,
                    as: "labs",
                    attributes: [
                        "id", "title", "slug", "description", "thumbnail",
                        "difficulty", "time_limit_minutes", "is_free", "price",
                    ],
                    where: { status: "published" },
                    required: false,
                },
            ],
        });

        // findByPk ignores top-level `where`, so enforce is_active explicitly.
        if (!record || record.is_active !== true) return null;
        const data = record.toJSON();
        await this._set(key, data, this.ttl);
        return data;
    }

    async invalidateFullCache(id) {
        await this._del(`cert:full:${id}`, `cert:public:full:${id}`, `cert:id:${id}`);
        await this._clearPattern("cert:list:*");
    }
}

module.exports = new CertificationRepository();