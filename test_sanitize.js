const { sanitizeCourseDescriptionHtml } = require('./React.shadcn.JS-Template-main/src/lib/sanitizeCourseHtml.js');

const html = `<p><span style="color: red; background-color: yellow">This is important</span></p>`;
const clean = sanitizeCourseDescriptionHtml(html);
console.log("Original:", html);
console.log("Cleaned:", clean);
