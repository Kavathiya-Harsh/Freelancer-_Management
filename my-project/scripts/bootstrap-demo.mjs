/**
 * FreelanceFlow — Bootstrap Demo Account
 *
 * Creates a demo user, organization, membership, and provisions the workspace
 * directly in the MONGODB_URI database. No separate SEED_MONGODB_URI required.
 *
 * Usage:
 *   node scripts/bootstrap-demo.mjs
 *
 * Env vars used:
 *   MONGODB_URI  — your MongoDB connection string (required)
 *   MONGODB_DB   — database name (default: freelanceflow)
 */
import { randomUUID } from "node:crypto";
import { MongoClient } from "mongodb";

const DEMO_EMAIL = "demo@freelanceflow.dev";
const DEMO_PASSWORD = "DemoPassword123!";
const DEMO_NAME = "Demo User";
const WORKSPACE_NAME = "FreelanceFlow Demo";
const WORKSPACE_SLUG = "demo-workspace";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ MONGODB_URI is not set. Check your .env.local file.");
    process.exitCode = 1;
    return;
  }

  const dbName = process.env.MONGODB_DB || "freelanceflow";
  console.log(`\n🔗 Connecting to MongoDB...`);
  console.log(`   Database: ${dbName}`);

  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  });

  try {
    await client.connect();
    console.log("✅ MongoDB connection successful!\n");

    const db = client.db(dbName);

    // Test basic operations
    const collections = await db.listCollections().toArray();
    console.log(`📦 Existing collections: ${collections.length}`);
    for (const col of collections) {
      const count = await db.collection(col.name).estimatedDocumentCount();
      console.log(`   - ${col.name}: ~${count} documents`);
    }

    // ─── 1. Create or find demo user ───
    console.log("\n👤 Setting up demo user...");
    const userCollection = db.collection("user");
    let user = await userCollection.findOne({ email: DEMO_EMAIL });

    if (user) {
      console.log(`   User already exists: ${user._id}`);
      // Ensure emailVerified is true
      await userCollection.updateOne(
        { _id: user._id },
        { $set: { emailVerified: true, updatedAt: new Date() } },
      );
    } else {
      const userId = randomUUID();
      await userCollection.insertOne({
        _id: userId,
        name: DEMO_NAME,
        email: DEMO_EMAIL,
        emailVerified: true,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      user = await userCollection.findOne({ _id: userId });
      console.log(`   ✅ Created user: ${userId}`);
    }

    // ─── 2. Create or update credential account ───
    console.log("🔑 Setting up credentials...");
    const accountCollection = db.collection("account");

    // Hash the password using the same algorithm as Better Auth
    // Better Auth uses argon2 or bcrypt depending on what's available
    // We'll use the Node.js built-in scrypt as a fallback, but actually
    // Better Auth stores the hash. Let's use their hashing utility.
    let passwordHash;
    try {
      // Try to use Better Auth's password hashing
      const { hashPassword } = await import("@better-auth/utils/password");
      passwordHash = await hashPassword(DEMO_PASSWORD);
    } catch {
      // Fallback: use argon2 directly
      try {
        const argon2 = await import("argon2");
        passwordHash = await argon2.hash(DEMO_PASSWORD);
      } catch {
        console.error("❌ Could not hash password. Install argon2: npm install argon2");
        process.exitCode = 1;
        return;
      }
    }

    const existingAccount = await accountCollection.findOne({
      userId: user._id,
      providerId: "credential",
    });

    if (existingAccount) {
      await accountCollection.updateOne(
        { _id: existingAccount._id },
        {
          $set: {
            password: passwordHash,
            updatedAt: new Date(),
          },
        },
      );
      console.log("   ✅ Updated existing credentials");
    } else {
      await accountCollection.insertOne({
        _id: randomUUID(),
        accountId: DEMO_EMAIL,
        providerId: "credential",
        userId: user._id,
        password: passwordHash,
        accessToken: null,
        refreshToken: null,
        idToken: null,
        expiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log("   ✅ Created credential account");
    }

    // ─── 3. Create or find organization ───
    console.log("🏢 Setting up workspace organization...");
    const orgCollection = db.collection("organization");
    let org = await orgCollection.findOne({ slug: WORKSPACE_SLUG });

    if (org) {
      console.log(`   Organization exists: ${org.id || org._id}`);
    } else {
      const orgId = randomUUID();
      await orgCollection.insertOne({
        _id: orgId,
        id: orgId,
        name: WORKSPACE_NAME,
        slug: WORKSPACE_SLUG,
        logo: null,
        metadata: null,
        createdAt: new Date(),
      });
      org = await orgCollection.findOne({ slug: WORKSPACE_SLUG });
      console.log(`   ✅ Created organization: ${orgId}`);
    }

    const orgId = org.id || org._id;

    // ─── 4. Create membership ───
    console.log("👥 Setting up membership...");
    const memberCollection = db.collection("member");
    let member = await memberCollection.findOne({
      organizationId: orgId,
      userId: user._id,
    });

    if (member) {
      await memberCollection.updateOne(
        { _id: member._id },
        { $set: { role: "owner", updatedAt: new Date() } },
      );
      console.log("   ✅ Membership exists (ensured owner role)");
    } else {
      await memberCollection.insertOne({
        _id: randomUUID(),
        organizationId: orgId,
        userId: user._id,
        role: "owner",
        createdAt: new Date(),
      });
      console.log("   ✅ Created owner membership");
    }

    // ─── 5. Provision workspace (lifecycle + preferences) ───
    console.log("⚙️  Provisioning workspace...");

    const lifecycleCollection = db.collection("workspaceLifecycles");
    const existingLifecycle = await lifecycleCollection.findOne({ organizationId: orgId });
    if (!existingLifecycle) {
      await lifecycleCollection.insertOne({
        organizationId: orgId,
        status: "active",
        archivedAt: null,
        archivedByUserId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log("   ✅ Created workspace lifecycle (active)");
    } else {
      if (existingLifecycle.status !== "active") {
        await lifecycleCollection.updateOne(
          { _id: existingLifecycle._id },
          { $set: { status: "active", archivedAt: null, updatedAt: new Date() } },
        );
        console.log("   ✅ Reactivated workspace");
      } else {
        console.log("   Workspace lifecycle already active");
      }
    }

    const prefsCollection = db.collection("workspacePreferences");
    const existingPrefs = await prefsCollection.findOne({ organizationId: orgId });
    if (!existingPrefs) {
      await prefsCollection.insertOne({
        organizationId: orgId,
        currency: "INR",
        timezone: "Asia/Kolkata",
        invoicePrefix: "INV",
        invoiceSequence: 0,
        notificationPreferences: {
          emailActivity: false,
          emailInvoices: false,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log("   ✅ Created workspace preferences");
    } else {
      console.log("   Workspace preferences already exist");
    }

    // ─── 6. Seed sample data ───
    console.log("\n📊 Seeding sample data...");
    await seedSampleData(db, orgId, user._id);

    // ─── Summary ───
    console.log("\n" + "═".repeat(55));
    console.log("  ✅ DEMO ACCOUNT READY");
    console.log("═".repeat(55));
    console.log(`  Email:     ${DEMO_EMAIL}`);
    console.log(`  Password:  ${DEMO_PASSWORD}`);
    console.log(`  Workspace: /w/${WORKSPACE_SLUG}`);
    console.log(`  Org ID:    ${orgId}`);
    console.log(`  User ID:   ${user._id}`);
    console.log("═".repeat(55));
    console.log("\n  Start the dev server:  npm run dev");
    console.log("  Then visit:            http://localhost:3000/sign-in");
    console.log("  Click 'Use demo account' to auto-fill credentials.\n");
  } catch (error) {
    console.error("\n❌ Bootstrap failed:", error.message || error);
    if (error.message?.includes("ENOTFOUND") || error.message?.includes("getaddrinfo")) {
      console.error("   → Check your internet connection and MONGODB_URI.");
    }
    if (error.message?.includes("Authentication failed") || error.message?.includes("auth")) {
      console.error("   → Check your MongoDB username and password in MONGODB_URI.");
    }
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

async function seedSampleData(db, orgId, userId) {
  const now = new Date();

  // ─── Clients ───
  const clientDefs = [
    { name: "Asha Patel", companyName: "NovaTech Solutions", email: "asha@novatech.example.test" },
    { name: "Leo Martin", companyName: "PixelCraft Studio", email: "leo@pixelcraft.example.test" },
    { name: "Maya Sharma", companyName: "GreenLeaf Digital", email: "maya@greenleaf.example.test" },
    { name: "Ethan Cole", companyName: "Horizon Ventures", email: "ethan@horizon.example.test" },
    { name: "Nina Rao", companyName: "BrightPath Consulting", email: "nina@brightpath.example.test" },
  ];

  const clientCollection = db.collection("clients");
  const existingClientCount = await clientCollection.countDocuments({ organizationId: orgId });

  if (existingClientCount > 0) {
    console.log(`   Clients: ${existingClientCount} already exist, skipping`);
  } else {
    const clientDocs = clientDefs.map((c, i) => ({
      organizationId: orgId,
      name: c.name,
      companyName: c.companyName,
      email: c.email,
      phone: `+91 90000${String(i + 1).padStart(5, "0")}`,
      website: `https://${c.companyName.toLowerCase().replace(/\s+/g, "")}.example.test`,
      billingAddress: {
        addressLine1: `${100 + i} Business Park`,
        city: ["Pune", "Mumbai", "Ahmedabad", "Bengaluru", "Delhi"][i],
        state: "India",
        postalCode: `4110${i}1`,
        country: "India",
      },
      notes: "",
      status: "active",
      normalizedName: c.name.toLowerCase(),
      normalizedEmail: c.email.toLowerCase(),
      normalizedCompanyName: c.companyName.toLowerCase(),
      createdByUserId: userId,
      updatedByUserId: userId,
      archivedAt: null,
      archivedByUserId: null,
      createdAt: new Date(now.getTime() - (120 - i * 10) * 86400000),
      updatedAt: now,
    }));
    await clientCollection.insertMany(clientDocs);
    console.log(`   ✅ Created ${clientDocs.length} clients`);
  }

  // ─── Projects ───
  const clients = await clientCollection.find({ organizationId: orgId, status: "active" }).toArray();

  const projectCollection = db.collection("projects");
  const existingProjectCount = await projectCollection.countDocuments({ organizationId: orgId });

  if (existingProjectCount > 0) {
    console.log(`   Projects: ${existingProjectCount} already exist, skipping`);
  } else {
    const projectDefs = [
      { name: "Corporate Website Redesign", status: "in_progress", priority: "high", code: "FF-101" },
      { name: "E-commerce Platform", status: "planning", priority: "urgent", code: "FF-102" },
      { name: "Mobile App Development", status: "in_progress", priority: "high", code: "FF-103" },
      { name: "Brand Identity System", status: "completed", priority: "medium", code: "FF-104" },
      { name: "SaaS Dashboard", status: "on_hold", priority: "urgent", code: "FF-105" },
      { name: "API Integration Project", status: "in_progress", priority: "high", code: "FF-106" },
    ];

    const projectDocs = projectDefs.map((p, i) => {
      const client = clients[i % clients.length];
      const startDate = new Date(now.getTime() - (90 - i * 12) * 86400000);
      const dueDate = new Date(now.getTime() + (30 + i * 20) * 86400000);
      return {
        organizationId: orgId,
        clientId: client._id,
        projectCode: p.code,
        name: p.name,
        normalizedName: p.name.toLowerCase(),
        description: `${p.name} — a demonstration project.`,
        status: p.status,
        priority: p.priority,
        budgetMinor: (250000 + i * 125000),
        currency: "INR",
        minorUnit: 2,
        startDate,
        dueDate,
        progressPercent: p.status === "completed" ? 100 : [30, 15, 55, 100, 10, 45][i],
        memberUserIds: [userId],
        tags: ["demo"],
        createdByUserId: userId,
        updatedByUserId: userId,
        archivedAt: null,
        archivedByUserId: null,
        createdAt: startDate,
        updatedAt: now,
      };
    });
    await projectCollection.insertMany(projectDocs);
    console.log(`   ✅ Created ${projectDocs.length} projects`);
  }

  // ─── Tasks ───
  const projects = await projectCollection.find({ organizationId: orgId }).toArray();
  const taskCollection = db.collection("tasks");
  const existingTaskCount = await taskCollection.countDocuments({ organizationId: orgId });

  if (existingTaskCount > 0) {
    console.log(`   Tasks: ${existingTaskCount} already exist, skipping`);
  } else {
    const taskTitles = [
      "Design homepage layout", "Build navigation component", "Create responsive grid",
      "Implement user auth", "Build API endpoints", "Write database models",
      "Create landing page", "Set up CI/CD pipeline", "Write unit tests",
      "Design mobile screens", "Optimize performance", "Code review sprint",
    ];
    const statuses = ["todo", "in_progress", "in_review", "done", "blocked"];
    const priorities = ["low", "medium", "high", "urgent"];

    const taskDocs = taskTitles.map((title, i) => {
      const project = projects[i % projects.length];
      const status = project.status === "completed" ? "done" : statuses[i % statuses.length];
      const dueDate = new Date(now.getTime() + (-10 + i * 5) * 86400000);
      return {
        organizationId: orgId,
        projectId: project._id,
        title,
        normalizedTitle: title.toLowerCase(),
        description: `Task: ${title}`,
        status,
        priority: priorities[i % priorities.length],
        assigneeUserIds: [userId],
        reporterUserId: userId,
        startDate: new Date(now.getTime() - (60 - i * 3) * 86400000),
        dueDate,
        estimatedMinutes: 60 + (i % 5) * 30,
        actualMinutes: status === "done" ? 90 + (i % 4) * 20 : 0,
        progressPercent: status === "done" ? 100 : status === "in_progress" ? 50 : status === "in_review" ? 80 : 0,
        tags: ["demo"],
        completedAt: status === "done" ? dueDate : null,
        completedByUserId: status === "done" ? userId : null,
        createdByUserId: userId,
        updatedByUserId: userId,
        archivedAt: null,
        createdAt: new Date(now.getTime() - (70 - i * 3) * 86400000),
        updatedAt: now,
      };
    });
    await taskCollection.insertMany(taskDocs);
    console.log(`   ✅ Created ${taskDocs.length} tasks`);
  }

  // ─── Milestones ───
  const milestoneCollection = db.collection("milestones");
  const existingMilestoneCount = await milestoneCollection.countDocuments({ organizationId: orgId });

  if (existingMilestoneCount > 0) {
    console.log(`   Milestones: ${existingMilestoneCount} already exist, skipping`);
  } else {
    const msTitles = ["Requirements Complete", "Design Phase Done", "MVP Ready",
      "Testing Complete", "Production Deployment", "Client Sign-off"];
    const msDocs = msTitles.map((title, i) => {
      const project = projects[i % projects.length];
      const due = new Date(now.getTime() + (-30 + i * 25) * 86400000);
      const completed = i < 2;
      return {
        organizationId: orgId,
        projectId: project._id,
        title,
        description: `Milestone: ${title}`,
        dueDate: due,
        status: completed ? "completed" : i === 2 ? "in_progress" : "upcoming",
        completedAt: completed ? new Date(due.getTime() + 2 * 86400000) : null,
        completedByUserId: completed ? userId : null,
        order: i + 1,
        targetAmountMinor: 0,
        currency: "INR",
        createdByUserId: userId,
        updatedByUserId: userId,
        archivedAt: null,
        createdAt: new Date(now.getTime() - (100 - i * 10) * 86400000),
        updatedAt: now,
      };
    });
    await milestoneCollection.insertMany(msDocs);
    console.log(`   ✅ Created ${msDocs.length} milestones`);
  }

  console.log("   ✅ Sample data seeding complete");
}

main();
