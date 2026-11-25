import { createHash, randomUUID } from "node:crypto";
import { MongoClient, ObjectId } from "mongodb";
import { pathToFileURL } from "node:url";
import { hashPassword } from "@better-auth/utils/password";

const BATCH_ID = "freelanceflow-demo-v1";
const COLLECTIONS = [
  "clients",
  "projects",
  "milestones",
  "tasks",
  "deliverables",
  "invoices",
  "payments",
  "activities",
];

function addDays(date, days) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function normalize(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function stableObjectId(key) {
  return new ObjectId(
    createHash("sha1").update(`${BATCH_ID}:${key}`).digest("hex").slice(0, 24),
  );
}

export function getDatabaseName(uri) {
  const parsed = new URL(uri);
  const name = parsed.pathname.replace(/^\/+|\/+$/g, "").split("/")[0];
  if (!name) throw new Error("SEED_MONGODB_URI must include an explicit database name.");
  return name;
}

export function validateSeedTarget(uri, allowDemoDatabase = false) {
  if (!uri) throw new Error("SEED_MONGODB_URI is required.");
  if (uri === process.env.MONGODB_URI) {
    throw new Error("SEED_MONGODB_URI must be different from MONGODB_URI.");
  }
  const databaseName = getDatabaseName(uri);
  const host = new URL(uri).host.toLowerCase();
  const dangerousName = /(production|prod|live|main)/i.test(databaseName);
  const dangerousHost = /(prod|production|live)/i.test(host);
  const approvedName =
    /(demo|test|development|dev|sandbox)/i.test(databaseName) || allowDemoDatabase;
  if (dangerousName || dangerousHost) {
    throw new Error("Refusing to seed a production-like database.");
  }
  if (!approvedName) {
    throw new Error(
      "Seed database name is not approved. Use a demo/test/dev/sandbox database or set SEED_ALLOW_DEMO_DATABASE=true.",
    );
  }
  return databaseName;
}

function calculateLineItem(
  description,
  quantityMilli,
  unitAmountMinor,
  discountMinor,
  taxBasisPoints,
) {
  const subtotal = Math.round((quantityMilli * unitAmountMinor) / 1000);
  const discount = Math.min(Math.max(discountMinor, 0), subtotal);
  const net = subtotal - discount;
  const tax = Math.round((net * taxBasisPoints) / 10000);
  return {
    description,
    quantityMilli,
    unitAmountMinor,
    lineDiscountMinor: discount,
    taxRateBasisPoints: taxBasisPoints,
    lineTotalMinor: net + tax,
  };
}

async function verifyContext(db) {
  const organizationId = process.env.SEED_ORGANIZATION_ID;
  const ownerUserId = process.env.SEED_OWNER_USER_ID;
  if (!organizationId) throw new Error("SEED_ORGANIZATION_ID is required.");
  if (!ownerUserId) throw new Error("SEED_OWNER_USER_ID is required.");

  const organization = await db.collection("organization").findOne({
    $or: [{ id: organizationId }, { _id: organizationId }],
  });
  if (!organization) throw new Error("The designated organization does not exist.");

  const lifecycle = await db
    .collection("workspaceLifecycles")
    .findOne({ organizationId });
  if (!lifecycle || lifecycle.status !== "active") {
    throw new Error(
      "The designated organization is not an active provisioned workspace.",
    );
  }

  const ownerMembership = await db.collection("member").findOne({
    organizationId,
    userId: ownerUserId,
  });
  if (!ownerMembership || !String(ownerMembership.role).split(",").includes("owner")) {
    throw new Error(
      "SEED_OWNER_USER_ID must be an existing owner member of the organization.",
    );
  }

  const ownerUser = await db.collection("user").findOne({
    $or: [{ id: ownerUserId }, { _id: ownerUserId }],
  });
  if (!ownerUser)
    throw new Error("SEED_OWNER_USER_ID does not exist in the user collection.");

  const members = await db.collection("member").find({ organizationId }).toArray();
  const userIds = Array.from(
    new Set(members.map((member) => String(member.userId)).filter(Boolean)),
  );
  if (!userIds.includes(ownerUserId)) userIds.push(ownerUserId);
  return { organizationId, ownerUserId, organization, userIds };
}

async function ensureManifest(db, context) {
  const collection = db.collection("freelanceflowSeedManifests");
  const manifest = await collection.findOne({
    batchId: BATCH_ID,
    organizationId: context.organizationId,
  });
  if (manifest) return manifest;
  const created = {
    batchId: BATCH_ID,
    organizationId: context.organizationId,
    ownerUserId: context.ownerUserId,
    status: "in_progress",
    preferenceCreated: false,
    records: Object.fromEntries(COLLECTIONS.map((name) => [name, []])),
    counts: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  await collection.insertOne(created);
  return created;
}

async function trackRecord(db, manifest, collectionName, logicalKey, document) {
  const existingEntry = manifest.records[collectionName].find(
    (entry) => entry.key === logicalKey,
  );
  if (existingEntry) {
    const existing = await db
      .collection(collectionName)
      .findOne({ _id: existingEntry.id });
    if (existing) return existing;
  }

  const id = existingEntry?.id ?? stableObjectId(`${collectionName}:${logicalKey}`);
  const existing = await db.collection(collectionName).findOne({ _id: id });
  if (existing) {
    if (!existingEntry) manifest.records[collectionName].push({ key: logicalKey, id });
    return existing;
  }

  await db.collection(collectionName).insertOne({ ...document, _id: id });
  if (!existingEntry) manifest.records[collectionName].push({ key: logicalKey, id });
  return { ...document, _id: id };
}

async function persistManifest(db, manifest) {
  manifest.updatedAt = new Date();
  await db
    .collection("freelanceflowSeedManifests")
    .updateOne(
      { batchId: BATCH_ID, organizationId: manifest.organizationId },
      { $set: manifest },
    );
}

const clientSeeds = [
  ["nova-tech", "NovaTech Solutions", "Asha Patel", "ashapatel@novatech.example.test"],
  ["pixel-craft", "PixelCraft Studio", "Leo Martin", "leo@pixelcraft.example.test"],
  ["green-leaf", "GreenLeaf Digital", "Maya Sharma", "maya@greenleaf.example.test"],
  ["horizon", "Horizon Ventures", "Ethan Cole", "ethan@horizon.example.test"],
  ["bright-path", "BrightPath Consulting", "Nina Rao", "nina@brightpath.example.test"],
  ["cloud-nest", "CloudNest Technologies", "Omar Khan", "omar@cloudnest.example.test"],
  ["urban-edge", "UrbanEdge Design", "Sara Lim", "sara@urbanedge.example.test"],
  ["blue-wave", "BlueWave Innovations", "Dev Mehta", "dev@bluewave.example.test"],
];

const projectSeeds = [
  ["corporate-website", "Corporate Website Redesign", "in_progress", "high"],
  ["ecommerce", "E-commerce Platform Development", "planning", "urgent"],
  ["mobile-app", "Mobile Application Development", "in_progress", "high"],
  ["brand-system", "Brand Identity System", "completed", "medium"],
  ["saas-dashboard", "SaaS Dashboard Development", "on_hold", "urgent"],
  ["portfolio", "Portfolio Website", "completed", "low"],
  ["api-integration", "API Integration Project", "in_progress", "high"],
  ["crm", "CRM System Implementation", "planning", "medium"],
  ["landing-page", "Landing Page Optimization", "completed", "medium"],
  ["booking", "Booking Platform", "in_progress", "high"],
  ["automation", "Business Automation System", "planning", "medium"],
  ["analytics", "Analytics Dashboard", "on_hold", "urgent"],
];

async function seedClients(db, manifest, context, now) {
  const records = [];
  for (let index = 0; index < clientSeeds.length; index += 1) {
    const [key, companyName, name, email] = clientSeeds[index];
    const active = index !== 3 && index !== 7;
    records.push(
      await trackRecord(db, manifest, "clients", key, {
        organizationId: context.organizationId,
        name,
        companyName,
        email,
        phone: `+91 90000${String(index + 1).padStart(5, "0")}`,
        website: `https://${normalize(companyName)}.example.test`,
        billingAddress: {
          addressLine1: `${100 + index} Demonstration Avenue`,
          addressLine2: "Example District",
          city: ["Pune", "Mumbai", "Ahmedabad", "Bengaluru"][index % 4],
          state: "India",
          postalCode: `4110${index}`,
          country: "India",
        },
        notes: "Fictional seed client created only for demonstration purposes.",
        status: active ? "active" : "archived",
        normalizedName: normalize(name),
        normalizedEmail: email.toLowerCase(),
        normalizedCompanyName: normalize(companyName),
        createdByUserId: context.ownerUserId,
        updatedByUserId: context.ownerUserId,
        archivedAt: active ? null : addDays(now, -20 - index),
        archivedByUserId: active ? null : context.ownerUserId,
        createdAt: addDays(now, -120 + index * 4),
        updatedAt: now,
      }),
    );
  }
  await persistManifest(db, manifest);
  return records;
}

async function seedProjects(db, manifest, context, now, clients, currency, minorUnit) {
  const records = [];
  for (let index = 0; index < projectSeeds.length; index += 1) {
    const [key, name, status, priority] = projectSeeds[index];
    const client = clients[index % clients.length];
    const activeClient = client.status === "active";
    const finalStatus = activeClient ? status : "cancelled";
    const progress =
      finalStatus === "completed"
        ? 100
        : finalStatus === "cancelled"
          ? 0
          : [20, 35, 55, 70][index % 4];
    const start = addDays(now, -90 + index * 7);
    const due = addDays(now, -30 + index * 15);
    const record = await trackRecord(db, manifest, "projects", key, {
      organizationId: context.organizationId,
      clientId: client._id,
      projectCode: `FF-${String(index + 101)}`,
      name,
      normalizedName: normalize(name),
      description: `Fictional seed project for ${name}.`,
      status: finalStatus,
      priority,
      budgetMinor: (250000 + index * 125000) * (minorUnit === 0 ? 1 : 100),
      currency,
      minorUnit,
      startDate: start,
      dueDate: due,
      progressPercent: progress,
      memberUserIds: context.userIds.slice(0, Math.min(3, context.userIds.length)),
      tags: ["demo", "seed"],
      createdByUserId: context.ownerUserId,
      updatedByUserId: context.ownerUserId,
      archivedAt: finalStatus === "cancelled" ? addDays(now, -5) : null,
      archivedByUserId: finalStatus === "cancelled" ? context.ownerUserId : null,
      createdAt: start,
      updatedAt: now,
    });
    records.push(record);
  }
  await persistManifest(db, manifest);
  return records;
}

async function seedMilestones(db, manifest, context, now, projects) {
  const titles = [
    "Requirement Analysis",
    "UI Design Complete",
    "Database Design Complete",
    "Backend API Complete",
    "Frontend Integration",
    "Internal Testing",
    "Client Review",
    "Final Delivery",
  ];
  const records = [];
  for (let index = 0; index < 18; index += 1) {
    const project = projects[index % projects.length];
    if (project.status === "cancelled") continue;
    const completed = index % 3 === 0;
    const due = addDays(now, completed ? -45 + index : -20 + index * 8);
    const record = await trackRecord(
      db,
      manifest,
      "milestones",
      `milestone-${index + 1}`,
      {
        organizationId: context.organizationId,
        projectId: project._id,
        title: `${titles[index % titles.length]} ${project.name}`,
        description: "Fictional seed milestone.",
        dueDate: due,
        status: completed ? "completed" : index % 4 === 0 ? "in_progress" : "upcoming",
        completedAt: completed ? addDays(due, 2) : null,
        completedByUserId: completed ? context.ownerUserId : null,
        order: index + 1,
        targetAmountMinor: 0,
        currency: project.currency,
        createdByUserId: context.ownerUserId,
        updatedByUserId: context.ownerUserId,
        archivedAt: null,
        createdAt: addDays(now, -100 + index),
        updatedAt: now,
      },
    );
    records.push(record);
  }
  await persistManifest(db, manifest);
  return records;
}

async function seedTasks(db, manifest, context, now, projects) {
  const titles = [
    "Design homepage",
    "Prepare wireframes",
    "Implement navigation",
    "Create responsive layouts",
    "Develop authentication integration",
    "Build database models",
    "Implement REST APIs",
    "Integrate frontend forms",
    "Write unit tests",
    "Fix responsive issues",
    "Prepare deployment",
    "Review final deliverables",
  ];
  const statuses = ["todo", "in_progress", "in_review", "blocked", "done"];
  const priorities = ["low", "medium", "high", "urgent"];
  const records = [];
  for (let index = 0; index < 40; index += 1) {
    const project = projects[index % projects.length];
    if (project.status === "cancelled") continue;
    const status =
      project.status === "completed" ? "done" : statuses[index % statuses.length];
    const due =
      status === "done" ? addDays(now, -30 + index) : addDays(now, -12 + index * 2);
    const assignee = context.userIds[index % context.userIds.length];
    const record = await trackRecord(db, manifest, "tasks", `task-${index + 1}`, {
      organizationId: context.organizationId,
      projectId: project._id,
      title: `${titles[index % titles.length]} ${index + 1}`,
      normalizedTitle: normalize(`${titles[index % titles.length]} ${index + 1}`),
      description: "Fictional seed task for demonstration.",
      status,
      priority: priorities[index % priorities.length],
      assigneeUserIds: [assignee],
      reporterUserId: context.ownerUserId,
      startDate: addDays(now, -60 + index),
      dueDate: due,
      estimatedMinutes: 60 + (index % 8) * 30,
      actualMinutes: status === "done" ? 60 + (index % 6) * 45 : 0,
      progressPercent:
        status === "done"
          ? 100
          : status === "in_progress"
            ? 55
            : status === "in_review"
              ? 80
              : 10,
      tags: ["demo", "seed"],
      completedAt: status === "done" ? due : null,
      completedByUserId: status === "done" ? assignee : null,
      createdByUserId: context.ownerUserId,
      updatedByUserId: context.ownerUserId,
      archivedAt: null,
      createdAt: addDays(now, -70 + index),
      updatedAt: now,
    });
    records.push(record);
  }
  await persistManifest(db, manifest);
  return records;
}

async function seedDeliverables(db, manifest, context, now, projects, milestones) {
  const titles = [
    "Initial Design Prototype",
    "Homepage UI",
    "Responsive Components",
    "API Documentation",
    "Database Schema",
    "Project Source Package",
    "Testing Report",
    "Final Project Documentation",
  ];
  const records = [];
  for (let index = 0; index < 20; index += 1) {
    const project = projects[index % projects.length];
    if (project.status === "cancelled") continue;
    const submitted = index % 4 !== 0;
    const approved = index % 5 === 1;
    const status = approved
      ? "approved"
      : submitted
        ? index % 7 === 0
          ? "revision_required"
          : "submitted"
        : "in_progress";
    const submittedAt = submitted ? addDays(now, -30 + index) : null;
    const milestone = milestones[index % milestones.length];
    const due = addDays(now, -10 + index * 5);
    const record = await trackRecord(
      db,
      manifest,
      "deliverables",
      `deliverable-${index + 1}`,
      {
        organizationId: context.organizationId,
        projectId: project._id,
        milestoneId:
          milestone?.projectId?.toString() === project._id.toString()
            ? milestone._id
            : null,
        title: `${titles[index % titles.length]} ${index + 1}`,
        normalizedTitle: normalize(`${titles[index % titles.length]} ${index + 1}`),
        description: "Fictional deliverable with no real uploaded file.",
        status,
        contributorUserIds: [context.userIds[index % context.userIds.length]],
        reviewerUserIds: [context.ownerUserId],
        dueDate: due,
        submittedAt,
        approvedAt: approved ? addDays(submittedAt || due, 3) : null,
        currentVersion: approved || status === "revision_required" ? 2 : 1,
        files: [],
        reviews: submitted
          ? [
              {
                reviewId: randomUUID(),
                action: "submitted",
                actorUserId: context.userIds[index % context.userIds.length],
                comment: "Demo submission created by the seed system.",
                versionNumber: 1,
                occurredAt: submittedAt,
              },
            ]
          : [],
        externalLinks: [],
        createdByUserId: context.ownerUserId,
        updatedByUserId: context.ownerUserId,
        archivedAt: null,
        createdAt: addDays(now, -90 + index),
        updatedAt: now,
      },
    );
    records.push(record);
  }
  await persistManifest(db, manifest);
  return records;
}

async function uniqueInvoiceNumber(db, organizationId, year, sequence) {
  let candidate = "";
  let offset = 0;
  do {
    candidate = `FF-DEMO-${year}-${String(sequence + offset).padStart(4, "0")}`;
    offset += 1;
  } while (
    await db.collection("invoices").findOne({ organizationId, invoiceNumber: candidate })
  );
  return candidate;
}

async function seedInvoices(
  db,
  manifest,
  context,
  now,
  clients,
  projects,
  currency,
  minorUnit,
) {
  const states = [
    "draft",
    "draft",
    "paid",
    "paid",
    "paid",
    "overdue",
    "overdue",
    "overdue",
    "pending",
    "pending",
    "pending",
    "pending",
    "paid",
    "paid",
    "pending",
  ];
  const records = [];
  const year = now.getUTCFullYear();
  for (let index = 0; index < states.length; index += 1) {
    const client = clients[index % clients.length];
    const project = projects[index % projects.length];
    const state = states[index];
    const issueDate = addDays(now, -90 + index * 5);
    const dueDate = addDays(now, state === "overdue" ? -45 + index : 20 + index * 3);
    const quantity = 1000 + (index % 3) * 500;
    const unitAmount = (25000 + index * 4000) * (minorUnit === 0 ? 1 : 1);
    const line1TaxBasisPoints = (index % 3) * 1800;
    const line1 = calculateLineItem(
      `Professional services for ${project.name}`,
      quantity,
      unitAmount,
      (index % 4) * 500,
      line1TaxBasisPoints,
    );
    const line2 = calculateLineItem(
      "Project support and documentation",
      1000,
      8000,
      0,
      1800,
    );
    const subtotal =
      Math.round((quantity * unitAmount) / 1000) + Math.round((1000 * 8000) / 1000);
    const discount = line1.lineDiscountMinor;
    const tax =
      line1.lineTotalMinor -
      (Math.round((quantity * unitAmount) / 1000) - line1.lineDiscountMinor) +
      (line2.lineTotalMinor - 8000);
    const total = subtotal - discount + tax;
    let amountPaid = 0;
    let status = "draft";
    let issuedAt = null;
    let paidAt = null;
    if (state !== "draft") {
      status = state === "overdue" ? "pending" : state;
      issuedAt = issueDate;
    }
    if (state === "paid") {
      amountPaid = total;
      status = "paid";
      paidAt = addDays(issueDate, 20);
    } else if (state === "overdue" || state === "pending") {
      amountPaid =
        state === "overdue"
          ? Math.floor(total * 0.35)
          : index % 3 === 0
            ? Math.floor(total * 0.25)
            : 0;
      if (state === "overdue") status = "overdue";
    }
    const amountDue = Math.max(0, total - amountPaid);
    const invoiceNumber = await uniqueInvoiceNumber(
      db,
      context.organizationId,
      year,
      index + 1,
    );
    const record = await trackRecord(db, manifest, "invoices", `invoice-${index + 1}`, {
      organizationId: context.organizationId,
      clientId: client._id,
      projectId: client.status === "active" ? project._id : null,
      invoiceNumber,
      status,
      currency,
      minorUnit,
      issueDate,
      dueDate,
      lineItems: [
        {
          description: line1.description,
          quantityMilli: quantity,
          unitAmountMinor: unitAmount,
          lineDiscountMinor: line1.lineDiscountMinor,
          taxRateBasisPoints: line1.taxRateBasisPoints,
          lineTotalMinor: line1.lineTotalMinor,
        },
        {
          description: line2.description,
          quantityMilli: 1000,
          unitAmountMinor: 8000,
          lineDiscountMinor: 0,
          taxRateBasisPoints: 1800,
          lineTotalMinor: line2.lineTotalMinor,
        },
      ],
      subtotalMinor: subtotal - line1.lineDiscountMinor - 0,
      discountMinor: discount,
      taxMinor: tax,
      totalMinor: total,
      amountPaidMinor: amountPaid,
      amountDueMinor: amountDue,
      issuerSnapshot: {
        name: context.organization.name || "FreelanceFlow Demo",
        email: "billing@freelanceflow.example.test",
        address: "Fictional demonstration address",
        taxId: "DEMO-TAX-ID",
      },
      clientSnapshot: {
        name: client.name,
        companyName: client.companyName,
        email: client.email,
        phone: client.phone,
        billingAddress: "Demonstration billing address",
      },
      notes: "Fictional demo invoice.",
      terms: "Demo payment terms: within 30 days.",
      createdByUserId: context.ownerUserId,
      updatedByUserId: context.ownerUserId,
      issuedAt,
      paidAt,
      voidedAt: null,
      archivedAt: null,
      createdAt: issueDate,
      updatedAt: now,
    });
    records.push(record);
  }
  await persistManifest(db, manifest);
  return records;
}

async function seedPayments(db, manifest, context, now, invoices) {
  const records = [];
  let paymentIndex = 0;
  for (let index = 0; index < invoices.length; index += 1) {
    const invoice = invoices[index];
    if (invoice.status === "draft") continue;

    if (invoice.status === "paid") {
      paymentIndex += 1;
      const record = await trackRecord(
        db,
        manifest,
        "payments",
        `payment-${paymentIndex}`,
        {
          organizationId: context.organizationId,
          invoiceId: invoice._id,
          clientId: invoice.clientId,
          projectId: invoice.projectId,
          amountMinor: invoice.totalMinor,
          currency: invoice.currency,
          minorUnit: invoice.minorUnit,
          paymentMethod: ["bank_transfer", "upi", "cheque"][paymentIndex % 3],
          paymentDate: addDays(invoice.issueDate, 15),
          paidAt: addDays(invoice.issueDate, 15),
          kind: "payment",
          status: "successful",
          reference: `DEMO-PAY-${String(paymentIndex).padStart(3, "0")}`,
          notes: "Fictional successful demo payment.",
          idempotencyKey: `seed:${BATCH_ID}:payment:${paymentIndex}`,
          reversalOfPaymentId: null,
          recordedByUserId: context.ownerUserId,
          createdAt: addDays(invoice.issueDate, 15),
          updatedAt: now,
        },
      );
      records.push(record);
      continue;
    }

    if (invoice.status === "overdue") {
      paymentIndex += 1;
      const partial = Math.floor(invoice.totalMinor * 0.35);
      const record = await trackRecord(
        db,
        manifest,
        "payments",
        `payment-${paymentIndex}`,
        {
          organizationId: context.organizationId,
          invoiceId: invoice._id,
          clientId: invoice.clientId,
          projectId: invoice.projectId,
          amountMinor: partial,
          currency: invoice.currency,
          minorUnit: invoice.minorUnit,
          paymentMethod: "bank_transfer",
          paymentDate: addDays(invoice.issueDate, 10),
          paidAt: addDays(invoice.issueDate, 10),
          kind: "payment",
          status: "successful",
          reference: `DEMO-PAY-${String(paymentIndex).padStart(3, "0")}`,
          notes: "Fictional partial demo payment.",
          idempotencyKey: `seed:${BATCH_ID}:payment:${paymentIndex}`,
          reversalOfPaymentId: null,
          recordedByUserId: context.ownerUserId,
          createdAt: addDays(invoice.issueDate, 10),
          updatedAt: now,
        },
      );
      records.push(record);

      if (paymentIndex % 2 === 1) {
        paymentIndex += 1;
        const failed = await trackRecord(
          db,
          manifest,
          "payments",
          `payment-${paymentIndex}`,
          {
            organizationId: context.organizationId,
            invoiceId: invoice._id,
            clientId: invoice.clientId,
            projectId: invoice.projectId,
            amountMinor: Math.floor(invoice.amountDueMinor * 0.2),
            currency: invoice.currency,
            minorUnit: invoice.minorUnit,
            paymentMethod: "upi",
            paymentDate: addDays(now, -5),
            paidAt: null,
            kind: "payment",
            status: "failed",
            reference: `DEMO-FAILED-${String(paymentIndex).padStart(3, "0")}`,
            notes: "Fictional failed payment attempt.",
            idempotencyKey: `seed:${BATCH_ID}:payment:${paymentIndex}`,
            reversalOfPaymentId: null,
            recordedByUserId: context.ownerUserId,
            createdAt: addDays(now, -5),
            updatedAt: now,
          },
        );
        records.push(failed);
      }
      continue;
    }

    paymentIndex += 1;
    const pending = await trackRecord(
      db,
      manifest,
      "payments",
      `payment-${paymentIndex}`,
      {
        organizationId: context.organizationId,
        invoiceId: invoice._id,
        clientId: invoice.clientId,
        projectId: invoice.projectId,
        amountMinor: Math.floor(invoice.amountDueMinor * 0.5),
        currency: invoice.currency,
        minorUnit: invoice.minorUnit,
        paymentMethod: ["cash", "bank_transfer", "other"][paymentIndex % 3],
        paymentDate: addDays(now, -2),
        paidAt: null,
        kind: "payment",
        status: "pending",
        reference: `DEMO-PENDING-${String(paymentIndex).padStart(3, "0")}`,
        notes: "Fictional pending payment record.",
        idempotencyKey: `seed:${BATCH_ID}:payment:${paymentIndex}`,
        reversalOfPaymentId: null,
        recordedByUserId: context.ownerUserId,
        createdAt: addDays(now, -2),
        updatedAt: now,
      },
    );
    records.push(pending);
  }

  await persistManifest(db, manifest);
  return records;
}

async function reconcileInvoices(db, manifest, context, now) {
  const invoiceEntries = manifest.records.invoices;
  let reconciled = 0;
  for (const entry of invoiceEntries) {
    const invoice = await db
      .collection("invoices")
      .findOne({ _id: entry.id, organizationId: context.organizationId });
    if (!invoice || invoice.status === "draft") continue;
    const successful = await db
      .collection("payments")
      .find({
        organizationId: context.organizationId,
        invoiceId: invoice._id,
        status: "successful",
      })
      .toArray();
    const paid = successful.reduce((sum, payment) => sum + payment.amountMinor, 0);
    const amountDue = Math.max(0, invoice.totalMinor - paid);
    let status = invoice.status;
    if (amountDue === 0) status = "paid";
    else if (invoice.dueDate < now) status = "overdue";
    await db.collection("invoices").updateOne(
      { _id: invoice._id, organizationId: context.organizationId },
      {
        $set: {
          amountPaidMinor: paid,
          amountDueMinor: amountDue,
          status,
          paidAt: amountDue === 0 ? now : null,
          updatedByUserId: context.ownerUserId,
          updatedAt: now,
        },
      },
    );
    reconciled += 1;
  }
  return reconciled;
}

async function seedActivities(
  db,
  manifest,
  context,
  now,
  clients,
  projects,
  tasks,
  milestones,
  deliverables,
  invoices,
  payments,
) {
  const records = [];
  const samples = [
    ["client", "created", clients],
    ["project", "created", projects],
    ["task", "status_changed", tasks],
    ["milestone", "completed", milestones.filter((item) => item.status === "completed")],
    ["deliverable", "submitted", deliverables.filter((item) => item.submittedAt)],
    ["invoice", "issued", invoices.filter((item) => item.status !== "draft")],
    [
      "payment",
      "payment_succeeded",
      payments.filter((item) => item.status === "successful"),
    ],
  ];
  let activityIndex = 0;
  for (const [entityType, action, entities] of samples) {
    for (let index = 0; index < Math.min(entities.length, 5); index += 1) {
      activityIndex += 1;
      const entity = entities[index];
      const record = await trackRecord(
        db,
        manifest,
        "activities",
        `activity-${activityIndex}`,
        {
          organizationId: context.organizationId,
          actorUserId: context.ownerUserId,
          entityType,
          action,
          entityId: entity._id,
          metadata: {
            seedBatch: BATCH_ID,
            label:
              entity.invoiceNumber ||
              entity.name ||
              entity.title ||
              entity.reference ||
              "Demo record",
          },
          occurredAt: addDays(now, -60 + index * 7 + activityIndex),
        },
      );
      records.push(record);
    }
  }
  await persistManifest(db, manifest);
  return records;
}

async function updatePreferences(db, manifest, context, now) {
  const collection = db.collection("workspacePreferences");
  const existing = await collection.findOne({ organizationId: context.organizationId });
  if (existing) return existing;
  await collection.insertOne({
    organizationId: context.organizationId,
    currency: "INR",
    timezone: "Asia/Kolkata",
    invoicePrefix: "FF-DEMO",
    invoiceSequence: 0,
    notificationPreferences: {
      emailActivity: false,
      emailInvoices: false,
    },
    createdAt: now,
    updatedAt: now,
  });
  manifest.preferenceCreated = true;
  await persistManifest(db, manifest);
  return collection.findOne({ organizationId: context.organizationId });
}

async function ensureDemoAccount(db, context, now) {
  const email = process.env.DEMO_ACCOUNT_EMAIL?.trim();
  const password = process.env.DEMO_ACCOUNT_PASSWORD;
  if (!email && !password) return { configured: false };
  if (!email || !password) {
    throw new Error(
      "DEMO_ACCOUNT_EMAIL and DEMO_ACCOUNT_PASSWORD must both be configured.",
    );
  }
  if (password.length < 12) {
    throw new Error("DEMO_ACCOUNT_PASSWORD must contain at least 12 characters.");
  }

  const userCollection = db.collection("user");
  let user = await userCollection.findOne({ email: email.toLowerCase() });
  if (!user) {
    const userId = randomUUID();
    await userCollection.insertOne({
      _id: userId,
      name: "FreelanceFlow Demo",
      email: email.toLowerCase(),
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    });
    user = await userCollection.findOne({ _id: userId });
  } else {
    await userCollection.updateOne(
      { _id: user._id },
      {
        $set: {
          emailVerified: true,
          updatedAt: now,
        },
      },
    );
  }

  const passwordHash = await hashPassword(password);
  await db.collection("account").updateOne(
    { accountId: email.toLowerCase(), providerId: "credential" },
    {
      $set: {
        password: passwordHash,
        updatedAt: now,
      },
      $setOnInsert: {
        _id: randomUUID(),
        accountId: email.toLowerCase(),
        providerId: "credential",
        userId: user._id,
        createdAt: now,
      },
    },
    { upsert: true },
  );

  await db.collection("member").updateOne(
    { organizationId: context.organizationId, userId: user._id },
    {
      $set: { role: "owner", updatedAt: now },
      $setOnInsert: {
        _id: randomUUID(),
        organizationId: context.organizationId,
        userId: user._id,
        role: "owner",
        createdAt: now,
      },
    },
    { upsert: true },
  );

  return { configured: true, email: email.toLowerCase() };
}

async function seedDatabase(db) {
  const context = await verifyContext(db);
  const now = new Date();
  const demoAccount = await ensureDemoAccount(db, context, now);
  const manifest = await ensureManifest(db, context);
  const preferences = await updatePreferences(db, manifest, context, now);
  context.organization.name = context.organization.name || "FreelanceFlow Demo";
  const currency = preferences?.currency || "INR";
  const minorUnit =
    currency === "JPY" || currency === "KRW"
      ? 0
      : currency === "BHD" || currency === "KWD"
        ? 3
        : 2;
  const existingComplete = manifest.status === "complete";
  const clients = await seedClients(db, manifest, context, now);
  const projects = await seedProjects(
    db,
    manifest,
    context,
    now,
    clients,
    currency,
    minorUnit,
  );
  const milestones = await seedMilestones(db, manifest, context, now, projects);
  const tasks = await seedTasks(db, manifest, context, now, projects);
  const deliverables = await seedDeliverables(
    db,
    manifest,
    context,
    now,
    projects,
    milestones,
  );
  const invoices = await seedInvoices(
    db,
    manifest,
    context,
    now,
    clients,
    projects,
    currency,
    minorUnit,
  );
  const payments = await seedPayments(db, manifest, context, now, invoices);
  const reconciled = await reconcileInvoices(db, manifest, context, now);
  await seedActivities(
    db,
    manifest,
    context,
    now,
    clients,
    projects,
    tasks,
    milestones,
    deliverables,
    invoices,
    payments,
  );

  manifest.status = "complete";
  manifest.counts = Object.fromEntries(
    await Promise.all(
      COLLECTIONS.map(async (name) => [
        name,
        await db.collection(name).countDocuments({
          _id: { $in: manifest.records[name].map((entry) => entry.id) },
        }),
      ]),
    ),
  );
  await persistManifest(db, manifest);

  return {
    idempotent: existingComplete,
    reconciled,
    counts: manifest.counts,
    demoAccount,
  };
}

async function statusDatabase(db) {
  const context = await verifyContext(db);
  const manifest = await db.collection("freelanceflowSeedManifests").findOne({
    batchId: BATCH_ID,
    organizationId: context.organizationId,
  });
  if (!manifest) return { manifest: null, counts: {} };
  const counts = {};
  for (const name of COLLECTIONS) {
    counts[name] = await db.collection(name).countDocuments({
      _id: { $in: (manifest.records[name] || []).map((entry) => entry.id) },
    });
  }
  return { manifest: { status: manifest.status, batchId: manifest.batchId }, counts };
}

async function resetDatabase(db) {
  const context = await verifyContext(db);
  if (process.argv.includes("--confirm-reset") !== true) {
    throw new Error("Reset requires --confirm-reset.");
  }
  const manifest = await db.collection("freelanceflowSeedManifests").findOne({
    batchId: BATCH_ID,
    organizationId: context.organizationId,
  });
  if (!manifest) return { removed: {} };
  const removed = {};
  for (const name of COLLECTIONS) {
    const ids = (manifest.records[name] || []).map((entry) => entry.id);
    if (ids.length) {
      const result = await db.collection(name).deleteMany({
        organizationId: context.organizationId,
        _id: { $in: ids },
      });
      removed[name] = result.deletedCount;
    } else {
      removed[name] = 0;
    }
  }
  await db.collection("freelanceflowSeedManifests").deleteOne({
    _id: manifest._id,
    organizationId: context.organizationId,
  });
  if (manifest.preferenceCreated) {
    await db.collection("workspacePreferences").deleteOne({
      organizationId: context.organizationId,
    });
  }
  return { removed };
}

async function main() {
  const mode = process.argv[2];
  if (!["seed", "status", "reset"].includes(mode)) {
    throw new Error("Use: seed | status | reset");
  }
  const uri = process.env.SEED_MONGODB_URI;
  validateSeedTarget(uri, process.env.SEED_ALLOW_DEMO_DATABASE === "true");
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 8000,
  });
  try {
    await client.connect();
    const db = client.db(getDatabaseName(uri));
    if (mode === "seed") {
      const result = await seedDatabase(db);
      console.log(JSON.stringify({ ok: true, mode, ...result }, null, 2));
    } else if (mode === "status") {
      const result = await statusDatabase(db);
      console.log(JSON.stringify({ ok: true, mode, ...result }, null, 2));
    } else {
      const result = await resetDatabase(db);
      console.log(JSON.stringify({ ok: true, mode, ...result }, null, 2));
    }
  } finally {
    await client.close();
  }
}

const isDirectRun =
  process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (isDirectRun) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : "Demo seed failed.");
    process.exitCode = 1;
  });
}
