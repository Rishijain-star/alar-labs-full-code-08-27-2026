const f1 = '["Subscription setup", "RBAC configuration"]';
const f2 = '"<p>Test <strong>HTML</strong> features</p>"';
const f3 = 'just a random string';

const parse = (f) => {
  if (typeof f === 'string') {
    try { return JSON.parse(f); } catch (e) { return f; }
  }
  return f;
}

console.log("f1:", parse(f1), Array.isArray(parse(f1)));
console.log("f2:", parse(f2), typeof parse(f2));
console.log("f3:", parse(f3), typeof parse(f3));
