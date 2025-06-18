import js from '@eslint/js';
import daStyle from 'eslint-config-dicodingacademy';
import { defineConfig } from 'eslint/config';


export default defineConfig([
  daStyle,
  js.configs.recommended,
  {
    files: ['**/*.{js,mjs,cjs}'],
    plugins: { js },
    extends: ['js/recommended'],
    rules: {
      'no-undef': 'off',
      'no-process-env': 'off',
      'no-unused-vars': 'off'
    }
  },
  { files: ['**/*.js'], languageOptions: { sourceType: 'commonjs' } },
]);