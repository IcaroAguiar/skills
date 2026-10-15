// ruleid: regen-flag-without-ci-guard
const shouldUpdate = process.env.UPDATE_API_DOCS === "1";

// ruleid: regen-flag-without-ci-guard
const record = process.env["RECORD_FIXTURES"];

// ok: regen-flag-without-ci-guard
const port = process.env.PORT;

// ok: regen-flag-without-ci-guard
const updatedAt = process.env.UPDATED_AT;

// ok: regen-flag-without-ci-guard
const refreshSecret = process.env.REFRESH_TOKEN_SECRET;

// ok: regen-flag-without-ci-guard
const writeUrl = process.env.WRITE_DATABASE_URL;
