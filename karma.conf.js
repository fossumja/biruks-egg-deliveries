module.exports = function (config) {
  const isCiRun =
    process.env.CI === 'true' ||
    process.env.CI === '1' ||
    process.argv.includes('--watch=false') ||
    process.argv.includes('--single-run') ||
    process.argv.includes('--singleRun');
  const baseReporters = ['progress', 'kjhtml'];
  const reporters = isCiRun
    ? [...baseReporters, 'coverage', 'junit']
    : baseReporters;

  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
      require('karma-junit-reporter'),
      require('@angular-devkit/build-angular/plugins/karma'),
    ],
    client: {
      jasmine: {},
      clearContext: false,
    },
    jasmineHtmlReporter: {
      suppressAll: true,
    },
    coverageReporter: {
      dir: require('path').join(__dirname, './coverage'),
      subdir: '.',
      reporters: [
        { type: 'html' },
        { type: 'lcovonly' },
        { type: 'text-summary' },
      ],
    },
    junitReporter: {
      outputDir: require('path').join(__dirname, './test-results'),
      outputFile: 'junit.xml',
      useBrowserName: false,
    },
    reporters,
    browsers: ['Chrome'],
    restartOnFileChange: true,
  });
};
