import path from "node:path";

import express from "express";
import session from "express-session";

import { env } from "./config/env.js";
import { getDatabaseClient } from "./shared/database/database.factory.js";
import { getAppearanceSettings, getCurrentFontDescriptor } from "./modules/assessment/assessment.appearance.js";
import { assessmentPlatformRouter } from "./modules/assessment/assessment.platform.routes.js";
import { assessmentRouter } from "./modules/assessment/assessment.routes.js";

import { getQuestionsRepository } from "./modules/questions/questions.repository.js";

const viewsPath = path.join(process.cwd(), "src/views");
const publicPath = path.join(process.cwd(), "public");

const app = express();
const databaseClient = getDatabaseClient();

databaseClient.migrate();
getQuestionsRepository().seedQuestions();

// Coolify and similar platforms terminate TLS before the Node app.
app.set("trust proxy", 1);

app.set("view engine", "ejs");
app.set("views", viewsPath);
app.locals.assetVersion = env.assetVersion;
app.locals.siteUrl = env.siteUrl;
app.locals.appearance = getAppearanceSettings();
app.locals.appearanceFont = getCurrentFontDescriptor();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  session({
    secret: env.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: env.nodeEnv === "production"
    }
  })
);
app.use(express.static(publicPath));
app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});
app.use("/", assessmentPlatformRouter);
app.use("/", assessmentRouter);

app.listen(env.port, () => {
  console.log(`MiRealYo migration scaffold listening on http://localhost:${env.port}`);
});
