const db = require('./src/models');
async function test() {
    try {
        const cs = await db.CloudService.findOne();
        if (cs) {
            console.log("Original features:", cs.features);
            cs.features = "<p>Test <strong>HTML</strong> features</p>";
            await cs.save();
            const reloaded = await db.CloudService.findByPk(cs.id);
            console.log("Reloaded features:", reloaded.features);
        }
    } catch(e) {
        console.error(e);
    }
}
test();
