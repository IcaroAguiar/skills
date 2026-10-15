async function rename(id: string, name: string) {
  const before = await this.prisma.project.findUniqueOrThrow({ where: { id } });
  if (before.status !== "ACTIVE") throw new Error("inactive");
  await this.prisma.$transaction(async (tx) => {
    await tx.project.update({ where: { id }, data: { name } });
    // ruleid: read-before-transaction
    await tx.event.create({ data: { before: before.name, after: name } });
  });
}

async function promote(id: string) {
  const current = await this.repository.findById(id);
  return this.dataSource.transaction((manager) =>
    // ruleid: read-before-transaction
    manager.save({ ...current, level: current.level + 1 }),
  );
}

async function existence(id: string) {
  const exists = await this.prisma.project.findUnique({ where: { id } });
  if (!exists) throw new NotFoundException();
  // ok: read-before-transaction
  await this.prisma.$transaction(async (tx) => {
    const before = await tx.project.findUniqueOrThrow({ where: { id } });
    await tx.event.create({ data: { before: before.name } });
  });
}
