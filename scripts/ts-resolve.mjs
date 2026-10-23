/**
 * Lets `node` run the checks directly against lib/*.ts.
 *
 * TypeScript source imports siblings without a file extension ('./segments'),
 * which bundlers resolve and Node does not. Node can strip the types on its
 * own, so the only thing missing is the extension — this retries a failed
 * relative resolve with '.ts' appended. Saves pulling in a TS runner just to
 * run a few hundred string assertions.
 */
import { registerHooks } from 'node:module'

registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context)
    } catch (err) {
      if (specifier.startsWith('.') && !specifier.endsWith('.ts')) {
        return nextResolve(`${specifier}.ts`, context)
      }
      throw err
    }
  },
})
