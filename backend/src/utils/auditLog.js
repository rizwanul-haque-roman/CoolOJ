const crypto = require("crypto");
const net = require("net");
const { isDeepStrictEqual } = require("node:util");
const db = require("../db");


const MAX_JSON_BYTES = 64 * 1024;
const MAX_JSON_DEPTH = 20;
const MAX_JSON_NODES = 10000;

const VALID_OUTCOMES = new Set([
  "success",
  "failure",
  "denied",
]);

const REQUEST_ID = Symbol("auditRequestId");

const SENSITIVE_KEYS = new Set([
  "password",
  "passwordhash",
  "currentpassword",
  "newpassword",
  "confirmpassword",
  "token",
  "accesstoken",
  "refreshtoken",
  "sessiontoken",
  "sessionid",
  "authorization",
  "cookie",
  "cookies",
  "setcookie",
  "apikey",
  "secret",
  "jwtsecret",
  "clientsecret",
  "credentials",
  "privatekey",
  "dbpassword",
  "databasepassword",
  "onlinecompilerapikey",
  "input",
  "stdin",
  "expectedoutput",
  "actualoutput",
  "stdout",
  "stderr",
  "compileoutput",
  "compileroutput",
  "hiddentests",
  "hiddentestcases",
  "testcases",
  "sourcecode",
  "code",
  "headers",
  "requestbody",
  "body",
]);


function normalizeKey(value) {
  return String(value)
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();
}


function isSensitiveKey(key) {
  const normalized = normalizeKey(key);

  return (
    SENSITIVE_KEYS.has(normalized) ||
    normalized.endsWith("password") ||
    normalized.endsWith("passwordhash") ||
    normalized.endsWith("token") ||
    normalized.endsWith("apikey") ||
    normalized.endsWith("secret") ||
    normalized.endsWith("privatekey")
  );
}


function textField(
  value,
  label,
  maxLength,
  { required = false, truncate = false } = {},
) {
  if (value === undefined || value === null) {
    if (required) {
      throw new Error(`Audit ${label} is required.`);
    }

    return null;
  }

  if (typeof value !== "string") {
    throw new Error(`Audit ${label} must be a string.`);
  }

  const normalized = value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .trim();

  if (!normalized) {
    if (required) {
      throw new Error(`Audit ${label} is required.`);
    }

    return null;
  }

  const characters = Array.from(normalized);

  if (characters.length > maxLength) {
    if (!truncate) {
      throw new Error(
        `Audit ${label} exceeds ${maxLength} characters.`,
      );
    }

    return characters.slice(0, maxLength).join("");
  }

  return normalized;
}


function identifier(value, label, maxLength) {
  const result = textField(value, label, maxLength, {
    required: true,
  });

  if (!/^[a-z][a-z0-9_]*$/.test(result)) {
    throw new Error(
      `Audit ${label} must use lowercase snake_case.`,
    );
  }

  return result;
}


function validateActorId(value) {
  if (value === undefined || value === null) return null;

  if (
    !Number.isSafeInteger(value) ||
    value <= 0 ||
    value > 2147483647
  ) {
    throw new Error("Audit administrator ID is invalid.");
  }

  return value;
}


function normalizeIp(req) {
  const value = req.ip || req.socket?.remoteAddress;

  if (typeof value !== "string" || !net.isIP(value)) {
    return null;
  }

  return value;
}


function requestMeta(req) {
  if (!req) {
    return {
      ipAddress: null,
      userAgent: null,
      requestId: crypto.randomUUID(),
    };
  }

  if (!req[REQUEST_ID]) {
    req[REQUEST_ID] = crypto.randomUUID();
  }

  const userAgent = req.headers?.["user-agent"];

  return {
    ipAddress: normalizeIp(req),
    userAgent:
      typeof userAgent === "string"
        ? textField(userAgent, "user agent", 512, {
            truncate: true,
          })
        : null,
    requestId: req[REQUEST_ID],
  };
}


function actorFrom(req) {
  const user = req?.user;

  if (!user) {
    return {
      adminId: null,
      adminName: null,
      adminEmail: null,
    };
  }

  return {
    adminId: validateActorId(user.userId),
    adminName: textField(user.name, "administrator name", 120),
    adminEmail: textField(
      user.email,
      "administrator email",
      255,
    ),
  };
}


function serializeMetadata(value, label) {
  if (value === undefined || value === null) return null;

  const ancestors = new WeakSet();
  let nodes = 0;

  function sanitize(current, depth) {
    nodes += 1;

    if (nodes > MAX_JSON_NODES || depth > MAX_JSON_DEPTH) {
      throw new Error(
        `Audit ${label} exceeds the metadata complexity limit.`,
      );
    }

    if (current === null) return null;

    if (
      typeof current === "string" ||
      typeof current === "boolean"
    ) {
      return current;
    }

    if (typeof current === "number") {
      if (!Number.isFinite(current)) {
        throw new Error(
          `Audit ${label} contains a non-finite number.`,
        );
      }

      return current;
    }

    if (current instanceof Date) {
      if (!Number.isFinite(current.getTime())) {
        throw new Error(
          `Audit ${label} contains an invalid date.`,
        );
      }

      return current.toISOString();
    }

    if (typeof current !== "object") {
      throw new Error(
        `Audit ${label} contains an unsupported value.`,
      );
    }

    if (ancestors.has(current)) {
      throw new Error(
        `Audit ${label} contains a circular reference.`,
      );
    }

    const prototype = Object.getPrototypeOf(current);

    if (
      !Array.isArray(current) &&
      prototype !== Object.prototype &&
      prototype !== null
    ) {
      throw new Error(
        `Audit ${label} must contain plain JSON values.`,
      );
    }

    ancestors.add(current);

    try {
      if (Array.isArray(current)) {
        return Array.from(current, (item) =>
          sanitize(item, depth + 1),
        );
      }

      const result = Object.create(null);

      for (const key of Object.keys(current)) {
        if (
          key === "__proto__" ||
          key === "constructor" ||
          key === "prototype" ||
          isSensitiveKey(key)
        ) {
          result[key] = "[REDACTED]";
          continue;
        }

        const descriptor = Object.getOwnPropertyDescriptor(
          current,
          key,
        );

        if (!descriptor || !("value" in descriptor)) {
          throw new Error(
            `Audit ${label} cannot contain property getters.`,
          );
        }

        // Optional object fields are omitted; unsupported array
        // items and other unsupported values are rejected.
        if (descriptor.value === undefined) continue;

        result[key] = sanitize(
          descriptor.value,
          depth + 1,
        );
      }

      return result;
    } finally {
      ancestors.delete(current);
    }
  }

  const serialized = JSON.stringify(sanitize(value, 0));

  if (Buffer.byteLength(serialized, "utf8") > MAX_JSON_BYTES) {
    throw new Error(
      `Audit ${label} exceeds the 64 KB storage limit.`,
    );
  }

  return serialized;
}


function diffChanges(before = {}, after = {}, fields = []) {
  const changes = {};

  for (const field of fields) {
    const previous = before?.[field] ?? null;
    const next = after?.[field] ?? null;

    const previousValue =
      previous instanceof Date
        ? previous.toISOString()
        : previous;

    const nextValue =
      next instanceof Date
        ? next.toISOString()
        : next;

    if (!isDeepStrictEqual(previousValue, nextValue)) {
      changes[field] = {
        before: previousValue,
        after: nextValue,
      };
    }
  }

  return Object.keys(changes).length ? changes : null;
}


async function writeAuditLog(connection, event) {
  if (
    !event ||
    typeof event !== "object" ||
    Array.isArray(event)
  ) {
    throw new Error("A valid audit event is required.");
  }

  const {
    req = null,
    adminId = null,
    adminName = null,
    adminEmail = null,
    action,
    category,
    targetType,
    targetId = null,
    description,
    details = null,
    changes = null,
    reason = null,
    outcome = "success",
  } = event;

  if (!VALID_OUTCOMES.has(outcome)) {
    throw new Error("Audit outcome is invalid.");
  }

  // For request-based events, only the authenticated context
  // supplies actor identity. Explicit fields support trusted
  // server-side callers without an HTTP request.
  const actor = req
    ? actorFrom(req)
    : {
        adminId: validateActorId(adminId),
        adminName: textField(
          adminName,
          "administrator name",
          120,
        ),
        adminEmail: textField(
          adminEmail,
          "administrator email",
          255,
        ),
      };

  const request = requestMeta(req);

  let normalizedTargetId = null;

  if (targetId !== null && targetId !== undefined) {
    if (
      typeof targetId !== "string" &&
      typeof targetId !== "number" &&
      typeof targetId !== "bigint"
    ) {
      throw new Error("Audit target ID is invalid.");
    }

    if (
      typeof targetId === "number" &&
      !Number.isSafeInteger(targetId)
    ) {
      throw new Error("Audit target ID must be a safe integer.");
    }

    normalizedTargetId = textField(
      String(targetId),
      "target ID",
      64,
      { required: true },
    );
  }

  const values = [
    actor.adminId,
    actor.adminName,
    actor.adminEmail,
    identifier(action, "action", 100),
    identifier(category, "category", 50),
    identifier(targetType, "target type", 50),
    normalizedTargetId,
    textField(description, "description", 500, {
      required: true,
      truncate: true,
    }),
    serializeMetadata(details, "details"),
    serializeMetadata(changes, "changes"),
    textField(reason, "reason", 1000),
    outcome,
    request.ipAddress,
    request.userAgent,
    request.requestId,
  ];

  const executor = connection ?? db;

  const [result] = await executor.execute(
    `INSERT INTO admin_audit_logs (
      admin_id,
      admin_name,
      admin_email,
      action,
      category,
      target_type,
      target_id,
      description,
      details,
      changes,
      reason,
      outcome,
      ip_address,
      user_agent,
      request_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    values,
  );

  return result.insertId;
}


module.exports = {
  writeAuditLog,
  diffChanges,
  requestMeta,
  actorFrom,
};