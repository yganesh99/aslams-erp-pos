import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

/** @type {import("eslint").Linter.Config[]} */
const eslintConfig = [
	...coreWebVitals,
	...typescript,
	{
		rules: {
			"@typescript-eslint/no-explicit-any": "off",
			"react-hooks/exhaustive-deps": "off",
			"react-hooks/set-state-in-effect": "off",
			"@next/next/no-img-element": "off",
		},
	},
	{
		files: ["tailwind.config.ts"],
		rules: {
			"@typescript-eslint/no-require-imports": "off",
		},
	},
];

export default eslintConfig;
