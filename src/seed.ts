import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const d = (days: number) => { const dt = new Date(); dt.setDate(dt.getDate() + days); dt.setHours(9, 0, 0, 0); return dt; };

async function main() {
  console.log('Seeding Plan365...');
  await prisma.conversationMessage.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.taskDependency.deleteMany();
  await prisma.task.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.userPreferences.deleteMany();
  await prisma.appSetting.deleteMany();
  await prisma.taskTemplate.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  // Default settings
  const defaults = [
    { key: 'app_name', value: 'Plan365' },
    { key: 'allow_registration', value: 'true' },
    { key: 'jwt_expire_hours', value: '168' },
    { key: 'task_types', value: JSON.stringify(['2D CAD', 'CAD', 'CAM', 'Tools', 'Others']) },
    { key: 'priorities', value: JSON.stringify(['Critical', 'High', 'Medium', 'Low']) },
    { key: 'statuses', value: JSON.stringify(['Todo', 'In Progress', 'Review', 'Testing', 'Done', 'Blocked', 'Handoff']) },
    { key: 'default_type', value: 'Others' },
    { key: 'default_priority', value: 'Medium' },
    { key: 'default_status', value: 'Todo' },
    { key: 'accent_color', value: 'emerald' },
    { key: 'date_format', value: 'YYYY-MM-DD' },
    { key: 'timezone', value: 'Asia/Jakarta' },
    { key: 'ai_provider', value: 'openai' },
    { key: 'ai_model', value: 'gpt-4o-mini' },
  ];
  for (const s of defaults) await prisma.appSetting.create({ data: s });

  // 6 CAD/CAM Task Templates
  const templates = [
    {
      name: 'Standard Part - CAD to CAM',
      description: 'Full workflow: 3D model → 2D drawings → CAM programming',
      type: 'CAD', category: 'part', isDefault: true,
      tasksJson: JSON.stringify([
        { title: 'Receive/verify customer specs & reference data', type: 'Others', priority: 'High', effort: 2, status: 'Todo' },
        { title: 'Create 3D CAD model', type: 'CAD', priority: 'High', effort: 16, status: 'Todo' },
        { title: 'Internal design review', type: 'Others', priority: 'Medium', effort: 2, status: 'Todo' },
        { title: 'Create 2D manufacturing drawings', type: '2D CAD', priority: 'High', effort: 12, status: 'Todo' },
        { title: 'GD&T & tolerance analysis', type: '2D CAD', priority: 'Medium', effort: 6, status: 'Todo' },
        { title: 'BOM & material specification', type: 'Others', priority: 'Low', effort: 2, status: 'Todo' },
        { title: 'CAM roughing toolpath', type: 'CAM', priority: 'High', effort: 8, status: 'Todo' },
        { title: 'CAM finishing toolpath', type: 'CAM', priority: 'High', effort: 8, status: 'Todo' },
        { title: 'Toolpath simulation & collision check', type: 'CAM', priority: 'Medium', effort: 4, status: 'Todo' },
        { title: 'NC program post-processor output', type: 'CAM', priority: 'High', effort: 2, status: 'Todo' },
        { title: 'Design inspection fixture/jig', type: 'Tools', priority: 'Low', effort: 8, status: 'Todo' },
        { title: 'First article inspection report', type: 'Others', priority: 'Medium', effort: 4, status: 'Todo' },
      ])
    },
    {
      name: '2D Drawing Package',
      description: 'Create 2D detail drawings from existing 3D model',
      type: '2D CAD', category: 'drawing', isDefault: true,
      tasksJson: JSON.stringify([
        { title: 'Import 3D model & verify revision', type: '2D CAD', priority: 'High', effort: 2, status: 'Todo' },
        { title: 'Create base views (front/top/side/iso)', type: '2D CAD', priority: 'High', effort: 6, status: 'Todo' },
        { title: 'Create section & detail views', type: '2D CAD', priority: 'High', effort: 6, status: 'Todo' },
        { title: 'Apply dimensions & tolerances', type: '2D CAD', priority: 'High', effort: 8, status: 'Todo' },
        { title: 'Add GD&T callouts', type: '2D CAD', priority: 'Medium', effort: 4, status: 'Todo' },
        { title: 'Create BOM & title block', type: '2D CAD', priority: 'Medium', effort: 2, status: 'Todo' },
        { title: 'Drawing review & approval', type: 'Others', priority: 'High', effort: 2, status: 'Todo' },
      ])
    },
    {
      name: 'CAM Programming - 3-Axis',
      description: 'Standard 3-axis CNC programming workflow',
      type: 'CAM', category: 'cam', isDefault: true,
      tasksJson: JSON.stringify([
        { title: 'Analyze part geometry & stock material', type: 'CAM', priority: 'High', effort: 2, status: 'Todo' },
        { title: 'Define work coordinate system (WCS)', type: 'CAM', priority: 'High', effort: 1, status: 'Todo' },
        { title: 'Select cutting tools & parameters', type: 'CAM', priority: 'High', effort: 2, status: 'Todo' },
        { title: 'Create facing/roughing operations', type: 'CAM', priority: 'High', effort: 6, status: 'Todo' },
        { title: 'Create finishing operations', type: 'CAM', priority: 'High', effort: 6, status: 'Todo' },
        { title: 'Create drilling/tapping operations', type: 'CAM', priority: 'Medium', effort: 3, status: 'Todo' },
        { title: 'Toolpath simulation & verify', type: 'CAM', priority: 'High', effort: 4, status: 'Todo' },
        { title: 'Post-processor & NC output', type: 'CAM', priority: 'High', effort: 2, status: 'Todo' },
        { title: 'Setup sheet generation', type: 'Others', priority: 'Medium', effort: 2, status: 'Todo' },
      ])
    },
    {
      name: 'Tooling & Fixture Design',
      description: 'Design jigs, fixtures, and tooling for production',
      type: 'Tools', category: 'tooling', isDefault: true,
      tasksJson: JSON.stringify([
        { title: 'Analyze workpiece & machining requirements', type: 'Tools', priority: 'High', effort: 4, status: 'Todo' },
        { title: 'Concept design - locating & clamping strategy', type: 'Tools', priority: 'High', effort: 6, status: 'Todo' },
        { title: '3D fixture model', type: 'CAD', priority: 'High', effort: 12, status: 'Todo' },
        { title: 'Select standard components (clamps, pins, bushings)', type: 'Tools', priority: 'Medium', effort: 4, status: 'Todo' },
        { title: 'Create 2D fixture drawings', type: '2D CAD', priority: 'High', effort: 10, status: 'Todo' },
        { title: 'Fixture assembly & tryout', type: 'Tools', priority: 'High', effort: 8, status: 'Todo' },
        { title: 'PPAP / first article validation', type: 'Others', priority: 'High', effort: 4, status: 'Todo' },
      ])
    },
    {
      name: 'Assembly Drawing Set',
      description: 'Multi-part assembly documentation package',
      type: '2D CAD', category: 'assembly', isDefault: true,
      tasksJson: JSON.stringify([
        { title: 'Collect all part models & verify revisions', type: 'Others', priority: 'High', effort: 2, status: 'Todo' },
        { title: 'Create assembly 3D model', type: 'CAD', priority: 'High', effort: 12, status: 'Todo' },
        { title: 'Create assembly drawing (exploded views)', type: '2D CAD', priority: 'High', effort: 10, status: 'Todo' },
        { title: 'Create sub-assembly drawings', type: '2D CAD', priority: 'Medium', effort: 8, status: 'Todo' },
        { title: 'Generate BOM with part numbers', type: 'Others', priority: 'High', effort: 4, status: 'Todo' },
        { title: 'Assembly instructions document', type: 'Others', priority: 'Medium', effort: 6, status: 'Todo' },
        { title: 'Final review & release', type: 'Others', priority: 'High', effort: 2, status: 'Todo' },
      ])
    },
    {
      name: 'Reverse Engineering Project',
      description: 'Scan → CAD → Drawings → CAM for existing parts',
      type: 'CAD', category: 'reverse', isDefault: true,
      tasksJson: JSON.stringify([
        { title: 'Physical part inspection & CMM scan', type: 'Tools', priority: 'High', effort: 8, status: 'Todo' },
        { title: 'Point cloud processing & mesh cleanup', type: 'CAD', priority: 'High', effort: 10, status: 'Todo' },
        { title: 'Create parametric 3D model from scan', type: 'CAD', priority: 'High', effort: 16, status: 'Todo' },
        { title: 'Compare nominal vs actual (deviation analysis)', type: 'CAD', priority: 'Medium', effort: 6, status: 'Todo' },
        { title: 'Create 2D manufacturing drawings', type: '2D CAD', priority: 'High', effort: 12, status: 'Todo' },
        { title: 'CAM programming for replacement part', type: 'CAM', priority: 'High', effort: 10, status: 'Todo' },
        { title: 'First article comparison & validation', type: 'Others', priority: 'High', effort: 4, status: 'Todo' },
      ])
    },
  ];
  for (const t of templates) await prisma.taskTemplate.create({ data: t });

  // Users
  const ap = await bcrypt.hash('admin123', 10);
  const up = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.create({ data: { username: 'admin', email: 'admin@plan365.local', hashedPassword: ap, fullName: 'Admin User', role: 'admin' } });
  const andi = await prisma.user.create({ data: { username: 'andi', email: 'andi@plan365.local', hashedPassword: up, fullName: 'Andi Pratama', role: 'user', weeklyCapacity: 40 } });
  const sari = await prisma.user.create({ data: { username: 'sari', email: 'sari@plan365.local', hashedPassword: up, fullName: 'Sari Dewi', role: 'user', weeklyCapacity: 40 } });
  const budi = await prisma.user.create({ data: { username: 'budi', email: 'budi@plan365.local', hashedPassword: up, fullName: 'Budi Santoso', role: 'user', weeklyCapacity: 40 } });
  const users = [admin, andi, sari, budi];

  for (const u of users) await prisma.userPreferences.create({ data: { userId: u.id } });

  // Projects
  const p1 = await prisma.project.create({ data: { name: 'Hydraulic Pump Housing', description: '3D CAD, 2D drawings, CAM for aluminum pump housing.', color: '#3b82f6', reference: 'HPP-2025-001', startDate: d(-14), dueDate: d(21), createdBy: admin.id } });
  const p2 = await prisma.project.create({ data: { name: 'CNC Fixture - Batch 24', description: 'Modular fixture for stainless bracket series.', color: '#10b981', reference: 'CFX-2025-024', startDate: d(-7), dueDate: d(28), createdBy: admin.id } });
  const p3 = await prisma.project.create({ data: { name: 'Gearbox Cover Redesign', description: 'Weight reduction + improved sealing.', color: '#f59e0b', reference: 'GBC-2025-012', startDate: d(-21), dueDate: d(14), createdBy: admin.id } });
  const projects = [p1, p2, p3];

  for (const p of projects) {
    await prisma.projectMember.create({ data: { projectId: p.id, userId: admin.id, role: 'owner' } });
    for (const u of [andi, sari, budi]) await prisma.projectMember.create({ data: { projectId: p.id, userId: u.id, role: 'editor' } });
  }

  // Tasks
  const T = (pid: number, title: string, type: string, status: string, priority: string, so: number, do_: number, prog: number, effort: number, assignee: typeof admin, creator: typeof admin, labels: string = '[]') =>
    prisma.task.create({ data: { projectId: pid, title, type, status, priority, startDate: d(so), dueDate: d(do_), progress: prog, effort, labels, assigneeId: assignee.id, createdBy: creator.id, description: `Task: ${title}` } });

  const t1 = await Promise.all([
    T(p1.id, 'Import customer STEP & clean geometry', 'CAD', 'Done', 'High', -14, -10, 100, 8, andi, admin, '["cad","step"]'),
    T(p1.id, 'Design mounting flange features', 'CAD', 'Done', 'High', -10, -5, 100, 12, andi, admin),
    T(p1.id, 'Create 2D detail drawing sheet 1', '2D CAD', 'Review', 'Medium', -3, 2, 80, 10, sari, admin),
    T(p1.id, 'Create 2D section views & GD&T', '2D CAD', 'In Progress', 'High', 0, 5, 40, 12, sari, admin),
    T(p1.id, 'CAM roughing strategy (face + pocket)', 'CAM', 'Todo', 'High', 3, 8, 0, 10, budi, admin),
    T(p1.id, 'CAM finishing & toolpath simulation', 'CAM', 'Todo', 'Medium', 6, 12, 0, 8, budi, admin),
    T(p1.id, 'Design inspection fixture', 'Tools', 'Todo', 'Low', 8, 15, 0, 6, andi, admin),
    T(p1.id, 'BOM & material order note', 'Others', 'Done', 'Low', -12, -11, 100, 2, admin, admin, '["procurement"]'),
  ]);
  const t2 = await Promise.all([
    T(p2.id, 'Concept sketch modular base plate', 'CAD', 'Done', 'Medium', -7, -5, 100, 6, andi, andi),
    T(p2.id, '3D model clamp assemblies', 'CAD', 'In Progress', 'High', -5, 3, 55, 14, andi, andi),
    T(p2.id, '2D layout drawing for shop floor', '2D CAD', 'Todo', 'Medium', 2, 7, 0, 10, sari, andi),
    T(p2.id, 'CAM for base plate (3-axis)', 'CAM', 'Todo', 'High', 5, 10, 0, 12, budi, andi),
    T(p2.id, 'Design locating pins & bushings', 'Tools', 'Review', 'Medium', -2, 1, 90, 8, andi, andi),
    T(p2.id, 'Handoff pack to production', 'Others', 'Handoff', 'High', 10, 12, 100, 3, admin, admin),
  ]);
  const t3 = await Promise.all([
    T(p3.id, 'Benchmark existing cover mass & stress', 'CAD', 'Done', 'High', -21, -18, 100, 8, andi, andi),
    T(p3.id, 'Topology concept A/B', 'CAD', 'Done', 'High', -18, -12, 100, 12, andi, andi),
    T(p3.id, 'Detailed 3D ribbing & seal groove', 'CAD', 'In Progress', 'High', -4, 4, 60, 16, andi, andi),
    T(p3.id, '2D manufacturing drawing set', '2D CAD', 'Todo', 'Medium', 4, 10, 0, 14, sari, andi),
    T(p3.id, 'CAM 5-axis finishing trial', 'CAM', 'Blocked', 'High', 8, 14, 10, 10, budi, andi),
    T(p3.id, 'Prototype toolpath review meeting', 'Others', 'Todo', 'Medium', 7, 8, 0, 2, admin, admin),
    T(p3.id, 'Design assembly jig for cover', 'Tools', 'Todo', 'Low', 12, 18, 0, 8, andi, andi),
  ]);

  // Dependencies
  const dep = (pred: { id: number }, succ: { id: number }, type = 'FS', lag = 0) =>
    prisma.taskDependency.create({ data: { predecessorId: pred.id, successorId: succ.id, type, lagDays: lag } });

  await Promise.all([
    dep(t1[0], t1[1]), dep(t1[1], t1[2], 'FS', 1), dep(t1[2], t1[3]), dep(t1[2], t1[4], 'SS', 2), dep(t1[4], t1[5], 'FS', 2), dep(t1[1], t1[6], 'SS', 3),
    dep(t2[0], t2[1], 'FS', 1), dep(t2[1], t2[2]), dep(t2[1], t2[3], 'FS', 2), dep(t2[2], t2[4]), dep(t2[3], t2[5], 'FS', -1),
    dep(t3[0], t3[1]), dep(t3[1], t3[2]), dep(t3[2], t3[3], 'SS', 3), dep(t3[2], t3[4], 'FS', 1), dep(t3[4], t3[5]), dep(t3[3], t3[6]),
  ]);

  // Conversations
  const c1 = await prisma.conversation.create({ data: { title: 'Pump Housing - Port Thread Spec', projectId: p1.id, createdBy: andi.id } });
  await prisma.conversationMessage.createMany({ data: [
    { conversationId: c1.id, userId: andi.id, content: 'Client updated port spec - BSPP threads instead of NPT. Updating the 3D model now.' },
    { conversationId: c1.id, userId: admin.id, content: 'Good. Also check if the O-ring groove dimensions change with BSPP.' },
    { conversationId: c1.id, userId: sari.id, content: 'Pausing FEA prep until the model is updated. Andi, please share revised model when ready.' },
  ] });
  const c2 = await prisma.conversation.create({ data: { title: 'Tooling - end mill for cavity', projectId: p1.id, createdBy: budi.id } });
  await prisma.conversationMessage.createMany({ data: [
    { conversationId: c2.id, userId: budi.id, content: 'For pump cavity roughing - 16mm carbide 4-flute at 45mm depth. Considering long-reach tool to avoid chatter.' },
    { conversationId: c2.id, userId: andi.id, content: 'That is 3:1 L/D ratio. Suggest 2-step: 25mm standard, then 45mm long-reach. Reduce step-over to 40%.' },
  ] });
  const c3 = await prisma.conversation.create({ data: { title: 'Fixture clamping force', projectId: p2.id, createdBy: sari.id } });
  await prisma.conversationMessage.createMany({ data: [
    { conversationId: c3.id, userId: sari.id, content: 'Batch 24 workpiece has 3mm thin wall. Toggle clamps with rubber pads recommended over hydraulic.' },
    { conversationId: c3.id, userId: andi.id, content: 'Agreed. Will use De-Sta-Co style toggle clamps with clearance for rubber pads.' },
  ] });
  const c4 = await prisma.conversation.create({ data: { title: 'Gearbox cover - weight reduction', projectId: p3.id, createdBy: andi.id } });
  await prisma.conversationMessage.createMany({ data: [
    { conversationId: c4.id, userId: andi.id, content: 'Original: 4.2kg. Redesign: 3.8kg. Target 3.57kg (-15%). Thinking of pocketing internal ribs.' },
    { conversationId: c4.id, userId: sari.id, content: 'Be careful with pocketing near seal area. Maybe lighten bolt flange instead?' },
    { conversationId: c4.id, userId: admin.id, content: 'Go with rib pocketing but add FEA validation. Sari, coordinate with analysis team.' },
  ] });

  console.log('Seed completed!');
  console.log('Users: admin/admin123 | andi,sari,budi/password123');
  console.log('Templates: 6 CAD/CAM presets created');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
