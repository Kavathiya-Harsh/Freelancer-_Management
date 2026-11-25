/**
 * FreelanceFlow — Rich Demo Data Seeder
 *
 * Populates realistic Invoices, Payments, and Deliverables for demo workspaces.
 * Lights up:
 *   - /w/[workspaceSlug]/invoices
 *   - /w/[workspaceSlug]/payments
 *   - /w/[workspaceSlug]/deliverables
 *   - /w/[workspaceSlug]/reports
 *   - /w/[workspaceSlug]/dashboard
 *
 * Usage:
 *   node --env-file=.env.local scripts/seed-rich-demo.mjs
 */
import { MongoClient, ObjectId } from "mongodb";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ MONGODB_URI is not set.");
    process.exit(1);
  }

  const dbName = process.env.MONGODB_DB || "freelanceflow";
  console.log(`\n🔗 Connecting to MongoDB (${dbName})...`);

  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  });

  try {
    await client.connect();
    const db = client.db(dbName);
    console.log("✅ Connected!\n");

    // 1. Find all demo / target organizations
    const orgs = await db.collection("organization").find({}).toArray();
    console.log(`🏢 Found ${orgs.length} organizations in database:`);
    orgs.forEach((o) => console.log(`   - ${o.name} (slug: ${o.slug}, id: ${o.id || o._id})`));

    for (const org of orgs) {
      const orgId = String(org.id || org._id);
      console.log(`\n──────────────────────────────────────────────────`);
      console.log(`📦 Seeding Rich Invoices, Payments & Deliverables for: ${org.name} (${orgId})`);
      console.log(`──────────────────────────────────────────────────`);

      // Find clients and projects for this organization
      const clients = await db.collection("clients").find({ organizationId: orgId }).toArray();
      const projects = await db.collection("projects").find({ organizationId: orgId }).toArray();
      const milestones = await db.collection("milestones").find({ organizationId: orgId }).toArray();

      if (clients.length === 0 || projects.length === 0) {
        console.log(`   ⚠️ No clients or projects found for ${org.name}. Skipping.`);
        continue;
      }

      console.log(`   Found ${clients.length} clients, ${projects.length} projects, ${milestones.length} milestones.`);

      // Find an owner / creator user for this org
      const membership = await db.collection("member").findOne({ organizationId: orgId });
      const userId = membership?.userId ? String(membership.userId) : "demo-owner";

      // ─── 1. SEED INVOICES ───
      const invoiceCollection = db.collection("invoices");
      const existingInvoicesCount = await invoiceCollection.countDocuments({ organizationId: orgId });

      if (existingInvoicesCount > 0) {
        console.log(`   ℹ️ Invoices already exist (${existingInvoicesCount}). Clearing existing to insert fresh rich set...`);
        await invoiceCollection.deleteMany({ organizationId: orgId });
      }

      const now = new Date();
      const daysAgo = (d) => new Date(now.getTime() - d * 86400000);
      const daysFromNow = (d) => new Date(now.getTime() + d * 86400000);

      const invoiceDefinitions = [
        {
          num: "INV-2026-001",
          clientIdx: 0,
          projIdx: 0,
          status: "paid",
          issueDaysAgo: 45,
          dueDaysAgo: 15,
          subtotal: 450000, // ₹4,500.00
          tax: 81000, // 18% GST = ₹810.00
          total: 531000,
          items: [
            { desc: "Corporate Website UI/UX Architecture & Wireframing", qty: 1000, unit: 250000 },
            { desc: "Design System Tokens & High-Fidelity Figma Screens", qty: 1000, unit: 200000 },
          ],
        },
        {
          num: "INV-2026-002",
          clientIdx: 1,
          projIdx: 1,
          status: "paid",
          issueDaysAgo: 30,
          dueDaysAgo: 10,
          subtotal: 720000, // ₹7,200.00
          tax: 129600,
          total: 849600,
          items: [
            { desc: "E-commerce Microservices & Database Schema", qty: 1000, unit: 420000 },
            { desc: "Next.js App Router Frontend & Cart Checkout Flow", qty: 1000, unit: 300000 },
          ],
        },
        {
          num: "INV-2026-003",
          clientIdx: 2,
          projIdx: 2,
          status: "paid",
          issueDaysAgo: 20,
          dueDaysAgo: 5,
          subtotal: 380000,
          tax: 68400,
          total: 448400,
          items: [
            { desc: "Mobile App Native Navigation & User Onboarding", qty: 1000, unit: 380000 },
          ],
        },
        {
          num: "INV-2026-004",
          clientIdx: 3,
          projIdx: 3,
          status: "pending",
          issueDaysAgo: 10,
          dueDaysAgo: -10, // Due 10 days from now
          subtotal: 540000,
          tax: 97200,
          total: 637200,
          items: [
            { desc: "Brand Strategy, Visual Guidelines & SVG Assets", qty: 1000, unit: 340000 },
            { desc: "Brand Collateral, Slide Decks & Social Assets", qty: 1000, unit: 200000 },
          ],
        },
        {
          num: "INV-2026-005",
          clientIdx: 4,
          projIdx: 4,
          status: "overdue",
          issueDaysAgo: 40,
          dueDaysAgo: 10, // Overdue by 10 days
          subtotal: 290000,
          tax: 52200,
          total: 342200,
          items: [
            { desc: "SaaS Dashboard Dark Mode & Accessibility Audit", qty: 1000, unit: 290000 },
          ],
        },
        {
          num: "INV-2026-006",
          clientIdx: 0,
          projIdx: 5,
          status: "draft",
          issueDaysAgo: 2,
          dueDaysAgo: -20,
          subtotal: 650000,
          tax: 117000,
          total: 767000,
          items: [
            { desc: "REST & GraphQL API Gateway Integrations", qty: 1000, unit: 450000 },
            { desc: "Stripe Webhook Subscriptions & Error Telemetry", qty: 1000, unit: 200000 },
          ],
        },
        {
          num: "INV-2026-007",
          clientIdx: 1,
          projIdx: 0,
          status: "paid",
          issueDaysAgo: 60,
          dueDaysAgo: 30,
          subtotal: 320000,
          tax: 57600,
          total: 377600,
          items: [
            { desc: "Sprint 1 Discovery & Technical Roadmap", qty: 1000, unit: 320000 },
          ],
        },
        {
          num: "INV-2026-008",
          clientIdx: 2,
          projIdx: 1,
          status: "pending",
          issueDaysAgo: 5,
          dueDaysAgo: -15,
          subtotal: 480000,
          tax: 86400,
          total: 566400,
          items: [
            { desc: "Performance Optimization, Lighthouse 95+ Audit", qty: 1000, unit: 480000 },
          ],
        },
      ];

      const insertedInvoices = [];

      for (const def of invoiceDefinitions) {
        const client = clients[def.clientIdx % clients.length];
        const project = projects[def.projIdx % projects.length];
        const isPaid = def.status === "paid";
        const isDraft = def.status === "draft";
        const issueDate = daysAgo(def.issueDaysAgo);
        const dueDate = def.dueDaysAgo > 0 ? daysAgo(def.dueDaysAgo) : daysFromNow(Math.abs(def.dueDaysAgo));

        const invoiceDoc = {
          _id: new ObjectId(),
          organizationId: orgId,
          clientId: client._id,
          projectId: project._id,
          invoiceNumber: def.num,
          status: def.status,
          currency: "INR",
          minorUnit: 2,
          issueDate,
          dueDate,
          lineItems: def.items.map((it) => ({
            description: it.desc,
            quantityMilli: it.qty,
            unitAmountMinor: it.unit,
            lineDiscountMinor: 0,
            taxRateBasisPoints: 1800, // 18% GST
            lineTotalMinor: Math.round(it.unit * 1.18),
          })),
          subtotalMinor: def.subtotal,
          discountMinor: 0,
          taxMinor: def.tax,
          totalMinor: def.total,
          amountPaidMinor: isPaid ? def.total : 0,
          amountDueMinor: isPaid ? 0 : def.total,
          issuerSnapshot: {
            name: org.name,
            email: "billing@freelanceflow.dev",
            address: "Level 4, Business Tower, Pune, India",
            taxId: "GSTIN27AABCF1234F1Z5",
          },
          clientSnapshot: {
            name: client.name,
            companyName: client.companyName,
            email: client.email,
            phone: client.phone || "+91 9876543210",
            billingAddress: client.billingAddress?.addressLine1 || "Commercial Zone, Bengaluru",
          },
          notes: "Thank you for your business. Please remit payments within the due date.",
          terms: "Payment terms: Net 15 days. Unpaid balances incur 1.5% monthly late fee.",
          createdByUserId: userId,
          updatedByUserId: userId,
          issuedAt: isDraft ? null : issueDate,
          paidAt: isPaid ? daysAgo(def.dueDaysAgo + 2) : null,
          voidedAt: null,
          archivedAt: null,
          createdAt: issueDate,
          updatedAt: isPaid ? daysAgo(def.dueDaysAgo + 2) : now,
        };

        await invoiceCollection.insertOne(invoiceDoc);
        insertedInvoices.push(invoiceDoc);
      }

      console.log(`   ✅ Created ${insertedInvoices.length} Invoices (Paid, Pending, Overdue, Draft).`);

      // ─── 2. SEED PAYMENTS ───
      const paymentCollection = db.collection("payments");
      await paymentCollection.deleteMany({ organizationId: orgId });

      const paidInvoices = insertedInvoices.filter((inv) => inv.status === "paid");
      const methods = ["bank_transfer", "upi", "cheque", "bank_transfer"];

      const paymentDocs = paidInvoices.map((inv, idx) => ({
        _id: new ObjectId(),
        organizationId: orgId,
        invoiceId: inv._id,
        clientId: inv.clientId,
        projectId: inv.projectId,
        amountMinor: inv.totalMinor,
        currency: "INR",
        minorUnit: 2,
        paymentMethod: methods[idx % methods.length],
        paymentDate: inv.paidAt || daysAgo(10),
        paidAt: inv.paidAt || daysAgo(10),
        kind: "payment",
        status: "successful",
        reference: `TXN-${inv.invoiceNumber}-${idx + 101}`,
        notes: `Full payment cleared via ${methods[idx % methods.length].toUpperCase()}`,
        recordedByUserId: userId,
        createdAt: inv.paidAt || daysAgo(10),
        updatedAt: inv.paidAt || daysAgo(10),
      }));

      // Add one pending payment transaction
      const pendingInvoice = insertedInvoices.find((inv) => inv.status === "pending");
      if (pendingInvoice) {
        paymentDocs.push({
          _id: new ObjectId(),
          organizationId: orgId,
          invoiceId: pendingInvoice._id,
          clientId: pendingInvoice.clientId,
          projectId: pendingInvoice.projectId,
          amountMinor: pendingInvoice.totalMinor,
          currency: "INR",
          minorUnit: 2,
          paymentMethod: "bank_transfer",
          paymentDate: daysAgo(1),
          paidAt: null,
          kind: "payment",
          status: "pending",
          reference: `TXN-PENDING-9942`,
          notes: "NEFT transfer initiated by client, awaiting bank settlement.",
          recordedByUserId: userId,
          createdAt: daysAgo(1),
          updatedAt: now,
        });
      }

      await paymentCollection.insertMany(paymentDocs);
      console.log(`   ✅ Created ${paymentDocs.length} Payments (Successful & Pending).`);

      // ─── 3. SEED DELIVERABLES ───
      const deliverableCollection = db.collection("deliverables");
      await deliverableCollection.deleteMany({ organizationId: orgId });

      const deliverableDefs = [
        {
          title: "Corporate Website UI Architecture & Wireframes",
          desc: "Complete wireframe blueprints for all desktop and mobile views.",
          status: "approved",
          projIdx: 0,
        },
        {
          title: "High-Fidelity Component Library (Figma)",
          desc: "Full tokenized component system including dark and light variants.",
          status: "approved",
          projIdx: 0,
        },
        {
          title: "E-Commerce Checkout Flow Prototype",
          desc: "Interactive payment and multi-step shipping address prototype.",
          status: "submitted",
          projIdx: 1,
        },
        {
          title: "Mobile App Onboarding Screens & Illustrations",
          desc: "Custom isometric illustrations for 4 splash onboarding screens.",
          status: "approved",
          projIdx: 2,
        },
        {
          title: "Brand Style Guide & Vector Logo Package",
          desc: "Comprehensive 40-page identity manual with color guidelines.",
          status: "revision_required",
          projIdx: 3,
        },
        {
          title: "REST API Documentation & Swagger Spec",
          desc: "OpenAPI 3.1 specification for all endpoints and authentication hooks.",
          status: "in_progress",
          projIdx: 4,
        },
      ];

      const deliverableDocs = deliverableDefs.map((del, i) => {
        const project = projects[del.projIdx % projects.length];
        const ms = milestones[i % milestones.length];
        return {
          _id: new ObjectId(),
          organizationId: orgId,
          projectId: project._id,
          milestoneId: ms?._id || null,
          title: del.title,
          normalizedTitle: del.title.toLowerCase(),
          description: del.desc,
          status: del.status,
          files: [
            {
              fileId: `file-${i + 1}`,
              originalFilename: `${del.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-v1.pdf`,
              storageKey: `deliverables/${orgId}/${project._id}/v1.pdf`,
              mimeType: "application/pdf",
              fileSize: 2450000 + i * 500000,
              versionNumber: 1,
              uploadedByUserId: userId,
              uploadedAt: daysAgo(15 - i * 2),
              comment: "Initial release for client inspection.",
            },
          ],
          reviews: [
            {
              reviewId: `rev-${i + 1}`,
              action: del.status === "approved" ? "approved" : del.status === "revision_required" ? "revision_requested" : "submitted",
              actorUserId: userId,
              comment: del.status === "approved" ? "Approved without changes." : del.status === "revision_required" ? "Please refine typography weights on page 4." : "Ready for review.",
              versionNumber: 1,
              occurredAt: daysAgo(5),
            },
          ],
          externalLinks: [
            {
              title: "Figma Canvas Prototype",
              url: "https://figma.com/@freelanceflow/demo-preview",
            },
          ],
          createdByUserId: userId,
          updatedByUserId: userId,
          approvedAt: del.status === "approved" ? daysAgo(5) : null,
          approvedByUserId: del.status === "approved" ? userId : null,
          archivedAt: null,
          createdAt: daysAgo(20 - i * 2),
          updatedAt: now,
        };
      });

      await deliverableCollection.insertMany(deliverableDocs);
      console.log(`   ✅ Created ${deliverableDocs.length} Deliverables (Approved, Submitted, In Progress).`);
    }

    console.log(`\n🎉 Rich demo data successfully seeded across all pages!`);
    console.log(`   - Invoices:   http://localhost:3000/w/demo-workspace/invoices`);
    console.log(`   - Payments:   http://localhost:3000/w/demo-workspace/payments`);
    console.log(`   - Reports:    http://localhost:3000/w/demo-workspace/reports`);
    console.log(`   - Dashboard:  http://localhost:3000/w/demo-workspace/dashboard`);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

main();
