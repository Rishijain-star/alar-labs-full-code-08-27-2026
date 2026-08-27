const { sanitizeCourseDescriptionHtml } = require('./React.shadcn.JS-Template-main/src/lib/sanitizeCourseHtml.js');

const html1 = `<p><span style="color: red;">Red text</span></p>`;
const html2 = `<p><span style="color: red;">Red text.</span></p>`;

console.log("HTML1 Cleaned:", sanitizeCourseDescriptionHtml(html1));
console.log("HTML2 Cleaned:", sanitizeCourseDescriptionHtml(html2));
