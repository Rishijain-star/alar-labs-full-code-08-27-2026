const db = require("./src/models/index");
const cloudServiceService = require("./src/services/cloudServiceService");
const { Op } = require("sequelize");

async function run() {
    try {
        const result = await cloudServiceService.getAll({
            where: { 
                is_active: true,
                [Op.and]: [
                    db.sequelize.literal(`JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.content_approval_status')) = 'approved'`)
                ]
            },
        });
        console.log("getAll Results length:", result.rows.length);
        console.log("Titles:", result.rows.map(r => r.title));
    } catch (e) {
        console.error("Error:", e.message);
    }
    process.exit(0);
}
run();
