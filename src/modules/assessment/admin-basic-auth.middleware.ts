import crypto from "node:crypto";

import type { Request, Response, NextFunction } from "express";

const ADMIN_USER = "adm_mirealyo";
const PASSWORD_PREFIX = "321321!";
const PASSWORD_TIMEZONE = "America/Bogota";

function getBogotaDateStamp(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: PASSWORD_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(now);

  const byType = new Map(parts.map((part) => [part.type, part.value]));
  return `${byType.get("year")}${byType.get("month")}${byType.get("day")}`;
}

function getExpectedPassword(now = new Date()) {
  return `${PASSWORD_PREFIX}${getBogotaDateStamp(now)}`;
}

function safeEquals(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

function unauthorized(res: Response) {
  res.setHeader("WWW-Authenticate", 'Basic realm="MiRealYo Admin"');
  return res.status(401).send("Autenticación requerida.");
}

function parseBasicAuthorization(req: Request) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Basic ")) {
    return null;
  }

  const encoded = header.slice("Basic ".length).trim();

  try {
    const decoded = Buffer.from(encoded, "base64").toString("utf8");
    const separatorIndex = decoded.indexOf(":");

    if (separatorIndex < 0) {
      return null;
    }

    return {
      username: decoded.slice(0, separatorIndex),
      password: decoded.slice(separatorIndex + 1)
    };
  } catch {
    return null;
  }
}

export function requireAdminBasicAuth(req: Request, res: Response, next: NextFunction) {
  if (req.session.adminBasicAuth === true) {
    return next();
  }

  const credentials = parseBasicAuthorization(req);

  if (!credentials) {
    return unauthorized(res);
  }

  const expectedPassword = getExpectedPassword();
  const isUserValid = safeEquals(credentials.username, ADMIN_USER);
  const isPasswordValid = safeEquals(credentials.password, expectedPassword);

  if (!isUserValid || !isPasswordValid) {
    return unauthorized(res);
  }

  req.session.adminBasicAuth = true;
  return next();
}

