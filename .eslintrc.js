module.exports = {
  root: true,
  extends: '@react-native',
  overrides: [
    {
      files: ['jest.setup.js', 'jest.env.mock.js'],
      env: { jest: true },
    },
  ],
};
