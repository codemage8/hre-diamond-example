module.exports = {
  extends: ['prettier'],
  plugins: ['prefer-arrow', 'deprecation', 'import', '@typescript-eslint'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  rules: {
    '@typescript-eslint/consistent-type-imports': 'error',
    'deprecation/deprecation': 'error',
    'arrow-body-style': 'off',
    '@typescript-eslint/no-unnecessary-condition': 'error',
    'no-console': 'error',
    // Allow _ for no-unused-variables https://stackoverflow.com/a/64067915/8930600
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_+',
        varsIgnorePattern: '^_+',
        caughtErrorsIgnorePattern: '^_+',
      },
    ],

    // https://stackoverflow.com/a/67652059/8930600
    'consistent-return': 'off',

    'no-unused-expressions': 'off',
    '@typescript-eslint/no-unused-expressions': 'error',

    'require-await': 'off',
    '@typescript-eslint/require-await': 'error',

    '@typescript-eslint/no-non-null-assertion': 'error',

    '@typescript-eslint/no-explicit-any': 'error',

    /** https://github.com/eslint-community/eslint-plugin-security/issues/21#issuecomment-1157887653 */
    'security/detect-object-injection': 'off',

    '@typescript-eslint/switch-exhaustiveness-check': 'error',

    '@typescript-eslint/await-thenable': 'error',

    '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],

    '@typescript-eslint/naming-convention': [
      'error',
      {
        selector: 'typeLike',
        format: ['PascalCase'],
        leadingUnderscore: 'allow',
      },
      {
        selector: 'parameter',
        format: ['camelCase'],
        leadingUnderscore: 'allow',
      },
      {
        /** We must support PascalCase because both zod schemas and unstated-next objects do use it */
        selector: 'variable',
        format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
        leadingUnderscore: 'allow',
      },
    ],
    'import/extensions': 'off',
    'import/no-relative-parent-imports': [
      'error',
      {
        ignore: ['~/'],
      },
    ],
  },
}
