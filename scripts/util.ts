/* eslint-disable no-console */
/**
 * Executes `script` and exits process with code 1 if an error was thrown during
 * execution and code 0 otherwise.
 *
 * This cannot include `if (require.main === module)` because it would evaluate
 * to false when this file is imported.
 * @param script
 */
export const executeScript = async (
  script: (() => Promise<void>) | (() => void)
): Promise<void> => {
  try {
    await script()
    process.exit(0)
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}
