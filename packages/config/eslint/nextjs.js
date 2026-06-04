/** Next.js ESLint preset — extends base + next/core-web-vitals */
module.exports = {
  extends: [
    require.resolve("./index.js"),
    "next/core-web-vitals",
  ],
  rules: {
    "react/no-unescaped-entities": "off",
  },
};
