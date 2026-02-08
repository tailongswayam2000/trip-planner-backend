const globals = require("globals");

module.exports = [
    {
        files: ["**/*.js"],
        languageOptions: {
            ecmaVersion: 2021,
            sourceType: "commonjs",
            globals: {
                ...globals.node,
                ...globals.commonjs
            }
        },
        rules: {
            "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
            "no-console": "off",
            "semi": ["error", "always"],
            "no-undef": "error"
        }
    },
    {
        ignores: ["node_modules/"]
    }
];
