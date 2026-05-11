# Remote Smoke Checklist

Run this before treating production isolation as verified.

## Current Durable Object Deployment

- Deploy with `npm run deploy`.
- Run `EPHEMERAL_ORIGIN=https://ephemeral.page npm run smoke:remote`.
- Confirm the smoke script creates an expression, fetches the generated page, submits once, rejects a double submit, polls the result, and reads submitted status.
- Create two expressions with different intents.
- Verify each expression URL includes a distinct expression id and view capability.
- Verify each result/status URL includes a distinct agent capability.
- Submit expression A and verify expression B remains active.
- Verify expression A serves only terminal UI after submission.
- Verify result polling for expression A works only with the agent capability.
- Force expiry and verify expired result envelopes remain accessible only to the agent capability until purge.

## Dynamic Workers Path

- Confirm the Cloudflare account has Dynamic Workers enabled.
- Deploy the control plane Worker with `RUNTIME_DRIVER=dynamic-workers`.
- Create two expressions with different intents and materials.
- Confirm each expression serves through its own isolated runtime unit.
- Confirm generated UI has no privileged bindings beyond the submit path.
- Submit expression A and verify expression B remains active.
- Verify expression A serves only terminal UI after submission.
- Verify result polling for expression A works only with the agent capability.
- Force expiry and verify runtime deletion/disablement and asset cleanup are observable.

## Workers for Platforms Fallback

- Create an untrusted dispatch namespace for expression runtimes.
- Scope the Cloudflare API token narrowly to script upload/delete for that namespace.
- Deploy the control plane Worker with `RUNTIME_DRIVER=workers-for-platforms`.
- Create two expressions and confirm distinct user Workers are created.
- Verify generated user Workers receive no privileged bindings.
- Submit expression A and confirm its user Worker is disabled/deleted.
- Expire expression B and confirm cleanup is idempotent.

## General Checks

- Human token cannot fetch result/status.
- Agent token cannot submit.
- Missing or invalid tokens return discovery-resistant errors.
- Callback URLs are rejected while callbacks are disabled in the MVP.
- R2 material objects are private and expression-scoped.
