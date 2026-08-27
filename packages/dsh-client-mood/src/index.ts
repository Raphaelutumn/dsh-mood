/**
 * Session-header mood status light, node half. The empty apply exists so the
 * plugin appears in the host cordis.yml / Loader; the browser half ships the
 * header utility through exports["./client"], discovered from the package.json
 * dsh.client declaration. The `mood` computation itself lives on the host in
 * @deepseek-ai/dsh-mood; this package only renders its projection.
 */

/** Host plugin body — no host-side behavior for this surface plugin. */
export function apply(): void {}
