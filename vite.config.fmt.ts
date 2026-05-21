const oxfmtConfig = {
  printWidth: 100,
  tabWidth: 4,
  useTabs: false,
  semi: true,
  singleQuote: true,
  trailingComma: "all",
  bracketSpacing: false,
  arrowParens: "avoid",
  endOfLine: "lf",
  quoteProps: "as-needed",
  sortImports: {
    internalPattern: ["@stagistic/*"],
  },
};

export default oxfmtConfig;
