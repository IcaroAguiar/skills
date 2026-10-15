async function announce(items: Item[], actor: Actor) {
  const allowed = [];
  for (const item of items) {
    // ruleid: await-in-loop-io
    if (await this.access.canEdit(actor, item.id)) allowed.push(item);
  }
  for (let i = 0; i < items.length; i++) {
    // ruleid: await-in-loop-io
    const owner = await this.prisma.user.findUnique({ where: { id: items[i].ownerId } });
  }
  for (const url of urls) {
    // ruleid: await-in-loop-io
    await fetch(url);
  }
  return allowed;
}

async function batched(items: Item[]) {
  // ok: await-in-loop-io
  const owners = await this.prisma.user.findMany({ where: { id: { in: items.map((item) => item.ownerId) } } });
  for (const item of items) {
    // ok: await-in-loop-io
    item.owner = owners.find((owner) => owner.id === item.ownerId);
  }
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    // ok: await-in-loop-io
    const page = await document.getPage(pageNumber);
  }
  for await (const chunk of stream) {
    // ok: await-in-loop-io
    await sink.write(chunk);
  }
}
