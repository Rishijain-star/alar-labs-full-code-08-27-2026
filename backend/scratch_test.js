const { CareerOffering } = require("./src/models");

async function testUpdate() {
  const offering = await CareerOffering.findOne();
  if (!offering) return console.log("No offering");

  console.log("Before:", offering.draft_data);
  
  await offering.update({ draft_data: { test: "data" } });
  const after1 = await CareerOffering.findByPk(offering.id);
  console.log("After setting object:", after1.draft_data);

  await after1.update({ draft_data: null });
  const after2 = await CareerOffering.findByPk(offering.id);
  console.log("After setting null:", after2.draft_data);
}

testUpdate().then(() => process.exit(0)).catch(console.error);
